import logging
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import ConflictError, InsufficientStockError, NotFoundError, ValidationError
from app.models import Customer, Order, OrderItem, Product
from app.schemas import (
    CustomerCreate,
    CustomerResponse,
    DashboardSummary,
    OrderCreate,
    OrderItemResponse,
    OrderResponse,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)

logger = logging.getLogger(__name__)

LOW_STOCK_THRESHOLD = 10


class ProductService:
    @staticmethod
    def list_products(db: Session) -> list[Product]:
        return db.query(Product).order_by(Product.name).all()

    @staticmethod
    def get_product(db: Session, product_id: int) -> Product:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product is None:
            raise NotFoundError("Product", product_id)
        return product

    @staticmethod
    def create_product(db: Session, payload: ProductCreate) -> Product:
        existing = db.query(Product).filter(Product.sku == payload.sku).first()
        if existing is not None:
            raise ConflictError(f"Product with SKU '{payload.sku}' already exists.")

        product = Product(
            name=payload.name.strip(),
            sku=payload.sku,
            price=payload.price,
            quantity_in_stock=payload.quantity_in_stock,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        logger.info("Created product id=%s sku=%s", product.id, product.sku)
        return product

    @staticmethod
    def update_product(db: Session, product_id: int, payload: ProductUpdate) -> Product:
        product = ProductService.get_product(db, product_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "sku" in update_data:
            sku = update_data["sku"]
            if sku is not None:
                existing = (
                    db.query(Product)
                    .filter(Product.sku == sku, Product.id != product_id)
                    .first()
                )
                if existing is not None:
                    raise ConflictError(f"Product with SKU '{sku}' already exists.")

        if "quantity_in_stock" in update_data and update_data["quantity_in_stock"] is not None:
            if update_data["quantity_in_stock"] < 0:
                raise ValidationError("Product quantity cannot be negative.")

        for field, value in update_data.items():
            if value is not None:
                if field == "name":
                    setattr(product, field, str(value).strip())
                else:
                    setattr(product, field, value)

        db.commit()
        db.refresh(product)
        logger.info("Updated product id=%s", product.id)
        return product

    @staticmethod
    def delete_product(db: Session, product_id: int) -> None:
        product = ProductService.get_product(db, product_id)
        try:
            db.delete(product)
            db.commit()
            logger.info("Deleted product id=%s", product_id)
        except IntegrityError as exc:
            db.rollback()
            raise ConflictError(
                "Cannot delete product because it is referenced by existing orders."
            ) from exc


class CustomerService:
    @staticmethod
    def list_customers(db: Session) -> list[Customer]:
        return db.query(Customer).order_by(Customer.full_name).all()

    @staticmethod
    def get_customer(db: Session, customer_id: int) -> Customer:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if customer is None:
            raise NotFoundError("Customer", customer_id)
        return customer

    @staticmethod
    def create_customer(db: Session, payload: CustomerCreate) -> Customer:
        email = payload.email.lower().strip()
        existing = db.query(Customer).filter(func.lower(Customer.email) == email).first()
        if existing is not None:
            raise ConflictError(f"Customer with email '{payload.email}' already exists.")

        customer = Customer(
            full_name=payload.full_name.strip(),
            email=email,
            phone_number=payload.phone_number.strip(),
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        logger.info("Created customer id=%s email=%s", customer.id, customer.email)
        return customer

    @staticmethod
    def delete_customer(db: Session, customer_id: int) -> None:
        customer = CustomerService.get_customer(db, customer_id)
        try:
            db.delete(customer)
            db.commit()
            logger.info("Deleted customer id=%s", customer_id)
        except IntegrityError as exc:
            db.rollback()
            raise ConflictError(
                "Cannot delete customer because they have existing orders."
            ) from exc


class OrderService:
    @staticmethod
    def _to_order_response(order: Order) -> OrderResponse:
        return OrderResponse(
            id=order.id,
            customer_id=order.customer_id,
            customer_name=order.customer.full_name if order.customer else "Unknown",
            total_amount=order.total_amount,
            created_at=order.created_at.isoformat() if order.created_at else "",
            items=[
                OrderItemResponse(
                    id=item.id,
                    product_id=item.product_id,
                    product_name=item.product.name if item.product else "Unknown",
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    line_total=item.line_total,
                )
                for item in order.items
            ],
        )

    @staticmethod
    def list_orders(db: Session) -> list[OrderResponse]:
        orders = db.query(Order).order_by(Order.created_at.desc()).all()
        return [OrderService._to_order_response(order) for order in orders]

    @staticmethod
    def get_order(db: Session, order_id: int) -> OrderResponse:
        order = db.query(Order).filter(Order.id == order_id).first()
        if order is None:
            raise NotFoundError("Order", order_id)
        return OrderService._to_order_response(order)

    @staticmethod
    def create_order(db: Session, payload: OrderCreate) -> OrderResponse:
        customer = CustomerService.get_customer(db, payload.customer_id)

        product_ids = [item.product_id for item in payload.items]
        if len(product_ids) != len(set(product_ids)):
            raise ValidationError("Duplicate products in the same order are not allowed.")

        products_by_id: dict[int, Product] = {}
        for product_id in product_ids:
            product = ProductService.get_product(db, product_id)
            products_by_id[product_id] = product

        for item in payload.items:
            product = products_by_id[item.product_id]
            if product.quantity_in_stock < item.quantity:
                raise InsufficientStockError(product.name, product.quantity_in_stock, item.quantity)

        total_amount = Decimal("0.00")
        order = Order(customer_id=customer.id, total_amount=total_amount)
        db.add(order)
        db.flush()

        for item in payload.items:
            product = products_by_id[item.product_id]
            line_total = (product.price * item.quantity).quantize(Decimal("0.01"))
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_price=product.price,
                line_total=line_total,
            )
            product.quantity_in_stock -= item.quantity
            total_amount += line_total
            db.add(order_item)

        order.total_amount = total_amount.quantize(Decimal("0.01"))
        db.commit()
        db.refresh(order)
        logger.info("Created order id=%s total=%s", order.id, order.total_amount)
        return OrderService._to_order_response(order)

    @staticmethod
    def delete_order(db: Session, order_id: int) -> None:
        order = db.query(Order).filter(Order.id == order_id).first()
        if order is None:
            raise NotFoundError("Order", order_id)

        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product is not None:
                product.quantity_in_stock += item.quantity

        db.delete(order)
        db.commit()
        logger.info("Deleted order id=%s and restored inventory", order_id)


class DashboardService:
    @staticmethod
    def get_summary(db: Session) -> DashboardSummary:
        total_products = db.query(func.count(Product.id)).scalar() or 0
        total_customers = db.query(func.count(Customer.id)).scalar() or 0
        total_orders = db.query(func.count(Order.id)).scalar() or 0
        low_stock = (
            db.query(Product)
            .filter(Product.quantity_in_stock <= LOW_STOCK_THRESHOLD)
            .order_by(Product.quantity_in_stock)
            .all()
        )

        return DashboardSummary(
            total_products=total_products,
            total_customers=total_customers,
            total_orders=total_orders,
            low_stock_products=[ProductResponse.model_validate(p) for p in low_stock],
        )
