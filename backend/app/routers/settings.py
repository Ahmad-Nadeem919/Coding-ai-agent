"""Get/update the active model name and sampling temperature."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.schemas import ModelSettingsOut, ModelSettingsUpdate
from app.state import AppState, get_state

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=ModelSettingsOut)
def get_settings(state: AppState = Depends(get_state)) -> ModelSettingsOut:
    return ModelSettingsOut(model_name=state.config.model_name, temperature=state.config.temperature)


@router.put("", response_model=ModelSettingsOut)
def update_settings(
    req: ModelSettingsUpdate, state: AppState = Depends(get_state)
) -> ModelSettingsOut:
    if req.model_name is not None:
        state.config.model_name = req.model_name
        state.client.set_model(req.model_name)
    if req.temperature is not None:
        state.config.temperature = req.temperature
    return ModelSettingsOut(model_name=state.config.model_name, temperature=state.config.temperature)
