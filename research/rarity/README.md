# Rarity

How many of each bird there are worldwide, as opposed to how easy it is to find on the Miller Peninsula this month (`presence`). It was briefly a "Worldwide" line in field notes and was taken out because it did not say how likely you are to see the bird (see the roadmap). The app does not read this folder.

[`rarity.json`](rarity.json) has one row per species in the app, with `common` and `scientific` names and, where assessed:

- `status`: the IUCN Red List category.
- `population`: the number of mature individuals worldwide, when there is an estimate.
- `source`: BirdLife International and the year of the species' last Red List assessment.

## Where the numbers come from

BirdLife International assesses every bird species for the IUCN Red List. Each value was read from the species' factsheet on BirdLife's [DataZone](https://datazone.birdlife.org) in November 2026: the Red List category, the year of last assessment, and "Number of mature individuals". BirdLife often takes the population from Partners in Flight or Wetlands International; the factsheet names which.

Rules applied:

- An estimate given as a range stays a range. A banded upper limit such as 499,999 is shown as 500,000.
- Where a factsheet gives a range and a best estimate, the range is used.
- No population is shown when the factsheet says "Unknown", gives none, or gives "0 - 0".

## Names that differ

BirdLife's names and taxonomy differ from the AOS names used here. Most are only different names for the same species (Grey Plover for Black-bellied Plover, Rough-legged Buzzard, Goosander, Brent Goose, Rock Dove, Arctic Jaeger, American Treecreeper, Northern Grey Shrike, Buff-bellied Pipit, Common Pheasant, Pacific-slope Flycatcher). Where BirdLife splits or lumps differently, the source says which taxon the numbers are for:

| Species here | BirdLife taxon used | Why |
| --- | --- | --- |
| Northern Flicker | Red-shafted Flicker | Split; the form on the Miller Peninsula |
| Fox Sparrow | Sooty Fox Sparrow | Split; the form on the Miller Peninsula |
| Swainson's Thrush | Russet-backed Thrush | Split; the form on the Miller Peninsula |
| Yellow-rumped Warbler | Audubon's Warbler | Split; the form that breeds here (Myrtle winters) |
| Barn Owl | Common Barn-owl | Status only; unclear whether it covers American birds |
| Short-billed Gull | Mew Gull | Lumped with the Eurasian Common Gull; status only |

The Black Oystercatcher has no rarity. DataZone has no factsheet for *Haematopus bachmani* under any name tried, and its search offers only the South American Blackish Oystercatcher.

The Chicken is domestic and has no assessment.
