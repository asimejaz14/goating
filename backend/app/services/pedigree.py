"""Pedigree assembly.

Nothing here is drawn by hand: the tree is a projection of the ``dam_id`` /
``sire_id`` links the user creates when linking a kid to its parents. Add goats
and link them, and the tree grows on its own.

The walk is breadth-first, one generation per round-trip, so a 4-generation tree
costs 4 queries rather than 30.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Goat
from app.schemas import PedigreeNode, PedigreeOut

DEFAULT_GENERATIONS = 4
MAX_GENERATIONS = 6


def clamp_generations(generations: int | None) -> int:
    """Keep the walk bounded — the depth cap is what protects the query count."""
    if generations is None:
        return DEFAULT_GENERATIONS
    return max(1, min(generations, MAX_GENERATIONS))


def total_slots(generations: int) -> int:
    """Ancestor slots in a full binary tree of this depth (root excluded)."""
    return 2 ** (generations + 1) - 2


def _node(goat: Goat, relation: str | None, generation: int) -> PedigreeNode:
    return PedigreeNode(
        id=goat.id,
        tag_number=goat.tag_number,
        name=goat.name,
        sex=goat.sex,
        breed_name=goat.breed.name if goat.breed else None,
        photo_url=goat.photo_url,
        date_of_birth=goat.date_of_birth,
        status=goat.status,
        relation=relation,
        generation=generation,
    )


def _placeholder(breed_name: str | None, relation: str, generation: int) -> PedigreeNode:
    """An ancestor we do not know yet.

    Carries the descendant's breed name rather than the word "Unknown", so the
    tree still reads as a herd record and the UI can offer "link this parent".
    """
    return PedigreeNode(
        breed_name=breed_name,
        relation=relation,
        generation=generation,
        is_placeholder=True,
    )


async def _load_goats(
    session: AsyncSession, goat_ids: Iterable[UUID]
) -> dict[UUID, Goat]:
    ids = [gid for gid in goat_ids if gid is not None]
    if not ids:
        return {}
    result = await session.execute(select(Goat).where(Goat.id.in_(ids)))
    return {goat.id: goat for goat in result.scalars().unique().all()}


async def build_tree(
    session: AsyncSession, root_goat: Goat, generations: int | None = None
) -> PedigreeOut:
    """Walk ancestors upwards from ``root_goat``."""
    depth_limit = clamp_generations(generations)

    root = _node(root_goat, None, 0)
    # Each frontier entry carries the ancestors already on its own branch, so a
    # bad link can never make a goat its own ancestor and spin forever.
    frontier: list[tuple[PedigreeNode, Goat, frozenset[UUID]]] = [
        (root, root_goat, frozenset({root_goat.id}))
    ]
    known = 0

    for generation in range(1, depth_limit + 1):
        if not frontier:
            break

        wanted: set[UUID] = set()
        for _, goat, _lineage in frontier:
            for parent_id in (goat.dam_id, goat.sire_id):
                if parent_id is not None:
                    wanted.add(parent_id)
        parents = await _load_goats(session, wanted)

        next_frontier: list[tuple[PedigreeNode, Goat, frozenset[UUID]]] = []
        for node, goat, lineage in frontier:
            for relation, parent_id in (("dam", goat.dam_id), ("sire", goat.sire_id)):
                parent = parents.get(parent_id) if parent_id else None
                if parent is None or parent.id in lineage:
                    child = _placeholder(node.breed_name, relation, generation)
                else:
                    child = _node(parent, relation, generation)
                    known += 1
                    next_frontier.append((child, parent, lineage | {parent.id}))
                setattr(node, relation, child)

        frontier = next_frontier

    return PedigreeOut(
        root=root,
        generations=depth_limit,
        known_ancestors=known,
        total_slots=total_slots(depth_limit),
    )


async def would_create_cycle(
    session: AsyncSession, goat_id: UUID, parent_id: UUID
) -> bool:
    """True when making ``parent_id`` a parent of ``goat_id`` closes a loop.

    A goat cannot be its own ancestor, and cannot be an ancestor of one of its
    own ancestors.
    """
    if goat_id == parent_id:
        return True

    seen: set[UUID] = {parent_id}
    frontier: Sequence[UUID] = [parent_id]
    # The depth guard is belt-and-braces: `seen` already stops any existing loop.
    for _ in range(MAX_GENERATIONS * 4):
        if not frontier:
            return False
        rows = await session.execute(
            select(Goat.dam_id, Goat.sire_id).where(Goat.id.in_(list(frontier)))
        )
        ancestors: list[UUID] = []
        for dam_id, sire_id in rows:
            for ancestor_id in (dam_id, sire_id):
                if ancestor_id is None or ancestor_id in seen:
                    continue
                if ancestor_id == goat_id:
                    return True
                seen.add(ancestor_id)
                ancestors.append(ancestor_id)
        frontier = ancestors
    return False
