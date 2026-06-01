from typing import Any


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: int | str) -> None:
        super().__init__(
            message=f"{resource} with id '{resource_id}' was not found.",
            status_code=404,
        )


class ConflictError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, status_code=409)


class ValidationError(AppError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message=message, status_code=422, details=details)


class InsufficientStockError(AppError):
    def __init__(self, product_name: str, available: int, requested: int) -> None:
        super().__init__(
            message=(
                f"Insufficient stock for '{product_name}'. "
                f"Available: {available}, requested: {requested}."
            ),
            status_code=400,
        )
