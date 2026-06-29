from typing import List
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models.contract import Contract
from app.schemas.contract import ContractSortField, SortOrder
from sqlalchemy import asc, desc

def _apply_filters(query, filters: dict):
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
    return query

def get_contracts_count(filters: dict, db: Session) -> int:
    query = _apply_filters(select(func.count()).select_from(Contract), filters)
    return db.execute(query).scalar() or 0

def get_contracts_list(filters: dict, skip: int, limit: int, sort_by: ContractSortField, sort_order: SortOrder, db: Session) -> List[Contract]:
    query = _apply_filters(select(Contract), filters)
    order_column = getattr(Contract, sort_by.value)
    order_func = desc if sort_order == SortOrder.desc else asc
    query = query.order_by(order_func(order_column)).offset(skip).limit(limit)
    return db.execute(query).scalars().all()

def get_contract_by_id(contract_id: int, db: Session) -> Contract | None:
    return db.execute(select(Contract).where(Contract.id == contract_id)).scalar_one_or_none()
