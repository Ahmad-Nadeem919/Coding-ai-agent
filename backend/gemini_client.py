"""Reusable client wrapper around the Gemini API via the google-genai SDK."""

from __future__ import annotations

import logging
import time
from collections.abc import Iterator

from google import genai
from google.genai import types

logger = logging.getLogger("coding_agent.gemini_client")

_NON_RETRYABLE_MARKERS = (
    "api key",
    "api_key",
    "permission_denied",
    "unauthenticated",
    "invalid argument",
    "401",
    "403",
)


class GeminiClientError(Exception):
    """Raised when the Gemini API cannot fulfill a request."""


class GeminiClient:
    """Thin, reusable wrapper around :class:`google.genai.Client`.

    Handles streaming and non-streaming generation, configurable sampling
    parameters, and automatic retries for transient failures.
    """

    def __init__(
        self,
        api_key: str,
        model_name: str = "gemini-2.5-flash",
        max_retries: int = 5,
        timeout: int = 120,
    ) -> None:
        self.model_name = model_name
        self.max_retries = max_retries
        self.timeout = timeout
        self._client = genai.Client(api_key=api_key)

    def set_model(self, model_name: str) -> None:
        self.model_name = model_name

    def _build_config(
        self,
        system_prompt: str | None,
        temperature: float | None,
        max_output_tokens: int | None,
    ) -> types.GenerateContentConfig:
        return types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )

    @staticmethod
    def _is_retryable(exc: Exception) -> bool:
        message = str(exc).lower()
        return not any(marker in message for marker in _NON_RETRYABLE_MARKERS)

    def generate(
        self,
        contents: list[dict] | str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_output_tokens: int | None = None,
    ) -> str:
        """Generate a complete (non-streaming) response, with retries."""
        config = self._build_config(system_prompt, temperature, max_output_tokens)
        last_error: Exception | None = None

        for attempt in range(1, self.max_retries + 1):
            try:
                response = self._client.models.generate_content(
                    model=self.model_name, contents=contents, config=config
                )
                return response.text or ""
            except Exception as exc:  # noqa: BLE001 - SDK error types vary by version
                last_error = exc
                if not self._is_retryable(exc) or attempt == self.max_retries:
                    break
                wait = min(2**attempt, 30)
                logger.warning(
                    "Gemini generate_content failed (attempt %d/%d): %s. Retrying in %ds",
                    attempt,
                    self.max_retries,
                    exc,
                    wait,
                )
                time.sleep(wait)

        raise GeminiClientError(f"Gemini request failed: {last_error}") from last_error

    def stream_chat(
        self,
        contents: list[dict] | str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_output_tokens: int | None = None,
    ) -> Iterator[str]:
        """Stream a response as an iterator of text chunks.

        Connection-level failures that occur before any content has been
        received are retried automatically with exponential backoff. Once
        streaming has begun, a failure is surfaced immediately so the caller
        can preserve and display whatever partial output was already
        received.
        """
        config = self._build_config(system_prompt, temperature, max_output_tokens)
        last_error: Exception | None = None
        stream = None

        for attempt in range(1, self.max_retries + 1):
            try:
                stream = self._client.models.generate_content_stream(
                    model=self.model_name, contents=contents, config=config
                )
                break
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if not self._is_retryable(exc) or attempt == self.max_retries:
                    raise GeminiClientError(f"Failed to reach Gemini API: {exc}") from exc
                wait = min(2**attempt, 30)
                logger.warning(
                    "Gemini stream request failed (attempt %d/%d): %s. Retrying in %ds",
                    attempt,
                    self.max_retries,
                    exc,
                    wait,
                )
                time.sleep(wait)

        if stream is None:
            raise GeminiClientError(f"Failed to reach Gemini API: {last_error}")

        try:
            for chunk in stream:
                text = getattr(chunk, "text", None)
                if text:
                    yield text
        except Exception as exc:  # noqa: BLE001
            raise GeminiClientError(f"Gemini response stream was interrupted: {exc}") from exc
