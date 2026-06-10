from typing import List
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.contract import Contract
from app.schemas.contract import ContractSortField, SortOrder
from sqlalchemy import asc, desc

def get_contracts_list(filters: dict, skip: int, limit: int, sort_by: ContractSortField, sort_order: SortOrder, db: Session) -> List[Contract]:
    query = select(Contract)
    for k, v in filters.items():
        column = getattr(Contract, k, None)
        if column is None or v is None:
            continue

        if isinstance(v, list):
            if not v:
                continue
            query = query.where(column.in_(v))
        else:
            query = query.where(column == v)

    order_column = getattr(Contract, sort_by.value)
    order_func = desc if sort_order == SortOrder.desc else asc
    query = query.order_by(order_func(order_column)).offset(skip).limit(limit)
    return db.execute(query).scalars().all()
