from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ProductCreate(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=255)]
    sku: Annotated[str, Field(min_length=1, max_length=100)]
    price: Annotated[Decimal, Field(gt=0)]
    quantity_in_stock: Annotated[int, Field(ge=0)] = 0

    @field_validator("sku")
    @classmethod
    def normalize_sku(cls, value: str) -> str:
        return value.strip().upper()


class ProductUpdate(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=255)] | None = None
    sku: Annotated[str, Field(min_length=1, max_length=100)] | None = None
    price: Annotated[Decimal, Field(gt=0)] | None = None
    quantity_in_stock: Annotated[int, Field(ge=0)] | None = None

    @field_validator("sku")
    @classmethod
    def normalize_sku(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip().upper()


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    price: Decimal
    quantity_in_stock: int


class CustomerCreate(BaseModel):
    full_name: Annotated[str, Field(min_length=1, max_length=255)]
    email: EmailStr
    phone_number: Annotated[str, Field(min_length=1, max_length=50)]


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone_number: str


class OrderItemCreate(BaseModel):
    product_id: Annotated[int, Field(gt=0)]
    quantity: Annotated[int, Field(gt=0)]


class OrderCreate(BaseModel):
    customer_id: Annotated[int, Field(gt=0)]
    items: Annotated[list[OrderItemCreate], Field(min_length=1)]


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    customer_name: str
    total_amount: Decimal
    created_at: str
    items: list[OrderItemResponse]


class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_products: list[ProductResponse]
