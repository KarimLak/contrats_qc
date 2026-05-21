from typing import List
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.contract import Contract

def get_contracts_list(filters: dict, skip: int, limit: int, db: Session) -> List[Contract]:
    filter_contracts = select(Contract)
    for k, i in filters.items():
        column = getattr(Contract, k, None)

        if column is not None:
            filter_contracts = filter_contracts.where(column==i)

    query = filter_contracts.offset(skip).limit(limit)
    contracts = db.execute(query).scalars().all()
    return contracts
