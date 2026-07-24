"""Pedigree assembly — the tree that builds itself from parent links."""

from uuid import uuid4

import pytest

from app.models import GoatSex
from app.services.pedigree import (
    DEFAULT_GENERATIONS,
    MAX_GENERATIONS,
    build_tree,
    clamp_generations,
    total_slots,
    would_create_cycle,
)
from tests.conftest import make_goat

# ---------------------------------------------------------------------------
# Depth bounds
# ---------------------------------------------------------------------------


def test_generations_default_when_unspecified():
    assert clamp_generations(None) == DEFAULT_GENERATIONS


def test_generations_are_capped_so_the_walk_stays_bounded():
    assert clamp_generations(99) == MAX_GENERATIONS


def test_generations_below_one_are_lifted_to_one():
    assert clamp_generations(0) == 1
    assert clamp_generations(-5) == 1


@pytest.mark.parametrize("generations,slots", [(1, 2), (2, 6), (3, 14), (4, 30)])
def test_total_slots_is_a_full_binary_tree_minus_the_root(generations, slots):
    assert total_slots(generations) == slots


# ---------------------------------------------------------------------------
# Tree assembly
# ---------------------------------------------------------------------------


async def test_a_goat_with_no_parents_is_all_placeholders(make_session):
    kid = make_goat("BGF-MC-03")
    tree = await build_tree(make_session(kid), kid, generations=2)

    assert tree.known_ancestors == 0
    assert tree.root.dam.is_placeholder is True
    assert tree.root.sire.is_placeholder is True


async def test_placeholders_carry_the_breed_name_not_the_word_unknown(make_session):
    """The user asked for the breed name in every empty slot."""
    kid = make_goat("BGF-MC-03", breed_name="Makhi Cheeni")
    tree = await build_tree(make_session(kid), kid, generations=2)

    assert tree.root.dam.breed_name == "Makhi Cheeni"
    assert tree.root.dam.tag_number is None


async def test_a_branch_stops_at_the_first_unknown_ancestor(make_session):
    """An unknown parent has no known parents of its own.

    Continuing past a placeholder would fill a 4-generation tree with 30 empty
    boxes; instead the branch ends and `known_ancestors / total_slots` carries
    how complete the pedigree is.
    """
    dam = make_goat("BGF-MC-01")
    kid = make_goat("BGF-MC-03", dam_id=dam.id)

    tree = await build_tree(make_session(kid, dam), kid, generations=4)

    assert tree.root.sire.is_placeholder is True
    assert tree.root.sire.dam is None
    assert (tree.known_ancestors, tree.total_slots) == (1, 30)


async def test_linking_parents_grows_the_tree(make_session):
    dam = make_goat("BGF-MC-01", sex=GoatSex.female)
    sire = make_goat("BGF-MC-02", sex=GoatSex.male)
    kid = make_goat("BGF-MC-03", dam_id=dam.id, sire_id=sire.id)

    tree = await build_tree(make_session(kid, dam, sire), kid, generations=2)

    assert tree.known_ancestors == 2
    assert tree.root.dam.tag_number == "BGF-MC-01"
    assert tree.root.sire.tag_number == "BGF-MC-02"
    assert tree.root.dam.is_placeholder is False


async def test_grandparents_appear_at_the_second_generation(make_session):
    granddam = make_goat("BGF-MC-00", sex=GoatSex.female)
    dam = make_goat("BGF-MC-01", sex=GoatSex.female, dam_id=granddam.id)
    kid = make_goat("BGF-MC-03", dam_id=dam.id)

    tree = await build_tree(make_session(kid, dam, granddam), kid, generations=3)

    assert tree.root.dam.dam.tag_number == "BGF-MC-00"
    assert tree.root.dam.dam.generation == 2
    assert tree.known_ancestors == 2


async def test_the_walk_stops_at_the_requested_depth(make_session):
    granddam = make_goat("BGF-MC-00")
    dam = make_goat("BGF-MC-01", dam_id=granddam.id)
    kid = make_goat("BGF-MC-03", dam_id=dam.id)

    tree = await build_tree(make_session(kid, dam, granddam), kid, generations=1)

    assert tree.root.dam.tag_number == "BGF-MC-01"
    assert tree.root.dam.dam is None  # generation 2 was never walked
    assert tree.known_ancestors == 1


async def test_one_query_per_generation_not_one_per_node(make_session):
    """A 4-generation tree must cost 4 round-trips, not 30."""
    dam = make_goat("BGF-MC-01")
    sire = make_goat("BGF-MC-02")
    kid = make_goat("BGF-MC-03", dam_id=dam.id, sire_id=sire.id)
    session = make_session(kid, dam, sire)

    await build_tree(session, kid, generations=4)

    assert session.queries <= 4


async def test_a_missing_parent_record_falls_back_to_a_placeholder(make_session):
    """A dangling link must render, not crash the page."""
    kid = make_goat("BGF-MC-03", dam_id=uuid4())
    tree = await build_tree(make_session(kid), kid, generations=2)

    assert tree.root.dam.is_placeholder is True


# ---------------------------------------------------------------------------
# Cycle protection
# ---------------------------------------------------------------------------


async def test_a_loop_in_the_data_cannot_spin_the_walk_forever(make_session):
    """Two goats listed as each other's parent still has to render."""
    a = make_goat("BGF-MC-01")
    b = make_goat("BGF-MC-02")
    a.dam_id = b.id
    b.dam_id = a.id

    tree = await build_tree(make_session(a, b), a, generations=4)

    assert tree.root.dam.tag_number == "BGF-MC-02"
    # The branch stops the moment it would revisit a goat already on it.
    assert tree.root.dam.dam.is_placeholder is True


async def test_line_breeding_still_renders_on_both_sides(make_session):
    """A shared ancestor across two branches is legitimate, not a cycle."""
    shared = make_goat("BGF-MC-00", sex=GoatSex.male)
    dam = make_goat("BGF-MC-01", sex=GoatSex.female, sire_id=shared.id)
    sire = make_goat("BGF-MC-02", sex=GoatSex.male, sire_id=shared.id)
    kid = make_goat("BGF-MC-03", dam_id=dam.id, sire_id=sire.id)

    tree = await build_tree(make_session(kid, dam, sire, shared), kid, generations=3)

    assert tree.root.dam.sire.tag_number == "BGF-MC-00"
    assert tree.root.sire.sire.tag_number == "BGF-MC-00"


async def test_a_goat_cannot_be_its_own_parent(make_session):
    goat = make_goat("BGF-MC-01")

    assert await would_create_cycle(make_session(goat), goat.id, goat.id) is True


async def test_linking_a_descendant_as_a_parent_is_a_cycle(make_session):
    """Making the kid its mother's mother would close the loop."""
    dam = make_goat("BGF-MC-01")
    kid = make_goat("BGF-MC-03", dam_id=dam.id)

    assert await would_create_cycle(make_session(kid, dam), dam.id, kid.id) is True


async def test_linking_a_grandchild_as_a_parent_is_a_cycle(make_session):
    granddam = make_goat("BGF-MC-00")
    dam = make_goat("BGF-MC-01", dam_id=granddam.id)
    kid = make_goat("BGF-MC-03", dam_id=dam.id)
    session = make_session(kid, dam, granddam)

    assert await would_create_cycle(session, granddam.id, kid.id) is True


async def test_an_unrelated_goat_is_a_perfectly_valid_parent(make_session):
    kid = make_goat("BGF-MC-03")
    stranger = make_goat("BGF-MC-09")

    session = make_session(kid, stranger)

    assert await would_create_cycle(session, kid.id, stranger.id) is False
