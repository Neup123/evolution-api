# Identifiers and partial metadata

## PN, LID, username, and group JIDs

- `...@s.whatsapp.net` is a phone-number (PN) JID. `phoneNumber` remains the full PN JID for compatibility; `phoneNumberDigits` is its digits-only form.
- `...@lid` is WhatsApp's privacy-preserving linked identity. When Baileys returns a LID as `id`, Evolution also fills `lid` with that same JID.
- `canonicalJid` prefers the PN JID when WhatsApp supplied a mapping, otherwise the LID or original `id`.
- `identifierType` describes the namespace of `id`: `phone-number`, `lid`, or `unknown`.
- `username` is optional and stays null unless WhatsApp actually supplies a username identifier. A missing username is not a failed PN/LID mapping.
- `...@g.us` identifies a group or community. It is not a business catalog owner JID.

## Group and community completeness

`groupMetadata` is a full metadata query and normally includes creation, owner, settings, and participants. `communityFetchLinkedGroups` is partial in upstream Baileys: its initial list may omit creation and owner. Evolution enriches each linked group with `groupMetadata`, removes the large participant array from that list response, and adds `metadataComplete`. Use `groupMetadata` when participants are required.

Join approval requests belong to each group, including a community subgroup. Use `groupRequestParticipantsList` with the group JID. A parent community has no single combined join-request queue, which is why the group method is the canonical operation.

## Catalog limitations

`getCatalog` and `getCollections` require the catalog owner's business PN JID, or no JID to query the connected account. Collections are catalog collections, not WhatsApp groups or communities. Baileys 7.0.0-rc13/rc14 has a confirmed upstream problem where WhatsApp waits about one minute and returns an empty successful response. Evolution preserves the empty result and adds a `diagnostics` object linking the upstream issue instead of pretending that emptiness proves no catalog exists.
