# WhatsApp identifiers, contacts, groups, and channels

Evolution API exposes identifiers from two different layers: WhatsApp/Baileys JIDs and Evolution's own database row IDs. They are not interchangeable.

## Quick rule

A WhatsApp group does **not** create a new person identity for each member. The group has its own `...@g.us` JID, while each member keeps their WhatsApp person identity. A person can have both a phone-number JID (PN) and a linked identity (LID), and the raw identifier returned by WhatsApp can use either form depending on the context and the group's addressing mode.

The same person can therefore appear in several groups with the same underlying PN/LID identity pair, even if the exact `id` string exposed in one response differs from another response.

| Suffix | Meaning |
|---|---|
| `@s.whatsapp.net` | Phone-number (PN) JID for a WhatsApp person/account. |
| `@lid` | Privacy-preserving linked identity for a WhatsApp person/account. |
| `@g.us` | Group or community conversation. |
| `@newsletter` | Newsletter/channel conversation. |
| `@broadcast` | Broadcast/status-style conversation where WhatsApp exposes one. |

## Person identity: PN and LID

Baileys 7 models a contact with these identity fields:

- `id` is the primary identity returned in that object. It can be a PN JID or a LID.
- `phoneNumber` is the full PN JID, ending in `@s.whatsapp.net`, when WhatsApp supplied that mapping.
- `lid` is the full LID, ending in `@lid`, when WhatsApp supplied that mapping.
- `username` is optional and remains absent unless WhatsApp actually supplies a username identifier.

A PN and a LID can represent the **same person**. Do not treat them as two different people merely because their strings differ.

For correlation logic, do not compare only the raw `id` when PN/LID mapping matters. In this fork's enriched group responses, prefer `canonicalJid`; otherwise retain both PN and LID when available and maintain their mapping.

`canonicalJid` prefers the PN JID when WhatsApp supplied one. If no PN mapping exists, it falls back to the LID or original `id`. It does not invent a phone number.

## Groups: membership is a relationship, not a new person ID

A group has its own JID, for example:

```text
120363111111111111@g.us
```

Baileys defines a `GroupParticipant` as a normal contact plus group-specific role fields such as `admin`, `isAdmin`, and `isSuperAdmin`. The participant's identity is therefore still the person's WhatsApp identity; the group does not mint a separate person ID for that membership.

Conceptually, the same person can appear like this in multiple groups:

```json
{
  "groupA": {
    "id": "120363111111111111@g.us",
    "participants": [
      {
        "id": "987654321@lid",
        "lid": "987654321@lid",
        "phoneNumber": "15551234567@s.whatsapp.net"
      }
    ]
  },
  "groupB": {
    "id": "120363222222222222@g.us",
    "participants": [
      {
        "id": "987654321@lid",
        "lid": "987654321@lid",
        "phoneNumber": "15551234567@s.whatsapp.net"
      }
    ]
  }
}
```

Those are two memberships of one WhatsApp person, not two group-specific identities.

### Why the raw participant `id` can still change

`GroupMetadata.addressingMode` can be `pn` or `lid`. WhatsApp can therefore expose the same participant primarily as a PN in one context and as a LID in another. This is an addressing/alias difference, not a new identity created by the group.

For message keys:

- In a direct chat, `key.remoteJid` identifies the other chat/account. `key.remoteJidAlt` can contain its alternate PN/LID identity.
- In a group message, `key.remoteJid` identifies the **group**. `key.participant` identifies the sender, and `key.participantAlt` can contain that sender's alternate PN/LID identity.
- `key.addressingMode` can indicate whether the message used PN or LID addressing.

When deduplicating people across group messages, use the participant identity fields, not the group's `remoteJid`.

## Channels / newsletters

A newsletter or channel has its own `...@newsletter` JID. That identifier belongs to the channel conversation; it is not a subscriber's person ID.

In the installed Baileys rc14 contract, `newsletterSubscribers` returns the subscriber **count**, not a list of subscriber identities. Do not infer a person's identity from the newsletter JID or from that count.

For newsletter messages, the conversation JID identifies the channel in the same way a group `remoteJid` identifies the group conversation.

## Evolution database IDs are a separate layer

Evolution's `Contact` table contains both:

- `id`: an Evolution-generated database CUID.
- `remoteJid`: the raw WhatsApp/Baileys contact identifier stored for that Evolution instance.

The contact uniqueness rule is `remoteJid + instanceId`. Therefore:

- Do not use `Contact.id` as a global WhatsApp identity.
- The same outside WhatsApp person connected through two Evolution instances can have two different Evolution `Contact.id` values.
- The `Contact` table itself does not guarantee that a PN JID and its matching LID are merged into one row. Correlation should use the PN/LID mapping when available.

This fork's `IsOnWhatsapp` cache is instance-scoped and stores alternative JID options so PN/LID mappings discovered for one Evolution instance do not leak into another instance.

## Fork-specific normalized group participant fields

This fork keeps Baileys's original participant fields and adds normalized fields to group/community metadata returned through the grouped Baileys API.

The normalization is applied to `groupMetadata`, `communityMetadata`, `groupFetchAllParticipating`, and `communityFetchAllParticipating` responses.

For each participant it can add:

- `lid`: full `...@lid` identity, or null when not known.
- `phoneNumber`: full PN JID ending in `@s.whatsapp.net`, or null when not known.
- `phoneNumberDigits`: digits-only PN value, or null when not known.
- `canonicalJid`: PN JID when known, otherwise LID or the original participant `id`.
- `identifierType`: `phone-number`, `lid`, or `unknown`, describing the namespace of the original `id`.

Example:

```json
{
  "id": "987654321@lid",
  "lid": "987654321@lid",
  "phoneNumber": "15551234567@s.whatsapp.net",
  "phoneNumberDigits": "15551234567",
  "canonicalJid": "15551234567@s.whatsapp.net",
  "identifierType": "lid",
  "admin": null
}
```

The original `id` is deliberately preserved for compatibility. The extra fields make identity matching easier without pretending that PN and LID are separate people.

Never interpret the numeric part of a `...@lid` value as a phone number.

## Group participant webhooks

`GROUP_PARTICIPANTS_UPDATE` / `group-participants.update` preserves the original Baileys-compatible:

```json
{
  "participants": ["...original JID..."]
}
```

and adds a backward-compatible `participantsData` array containing `jid`, `phoneNumber`, `name`, and `imgUrl` when available.

There is an important compatibility detail: `participantsData.phoneNumber` is **best effort**. When `findParticipants` supplied a real `phoneNumber` mapping, that value is the PN JID and can be used as the mapped phone identity. When no mapping is available, the current compatibility fallback strips the suffix from the original participant ID. If that original ID is a LID, the resulting digits are LID digits, **not a verified phone number**.

For logic that requires an authoritative phone identity, require a real PN mapping rather than assuming every `participantsData.phoneNumber` value is a telephone number.

## LID mapping events

Baileys can emit `lid-mapping.update` with a PN/LID pair. This fork forwards it as the `LID_MAPPING_UPDATE` webhook and also persists the pair in the instance-scoped WhatsApp identity cache.

This event is useful when an integration needs to correlate a LID seen in groups/messages with the person's PN JID later. Mapping availability is still controlled by what WhatsApp exposes; code should tolerate a missing mapping.

## Group and community completeness

`groupMetadata` is a full metadata query and normally includes creation, owner, settings, and participants. `communityFetchLinkedGroups` is partial in upstream Baileys: its initial list may omit creation and owner. Evolution enriches each linked group with `groupMetadata`, removes the large participant array from that list response, and adds `metadataComplete`. Use `groupMetadata` when participants are required.

Join approval requests belong to each group, including a community subgroup. Use `groupRequestParticipantsList` with the group JID. A parent community has no single combined join-request queue, which is why the group method is the canonical operation.

## Catalog limitations

`getCatalog` and `getCollections` require the catalog owner's business PN JID, or no JID to query the connected account. Collections are catalog collections, not WhatsApp groups or communities. Baileys 7.0.0-rc13/rc14 has a confirmed upstream problem where WhatsApp waits about one minute and returns an empty successful response. Evolution preserves the empty result and adds a `diagnostics` object linking the upstream issue instead of pretending that emptiness proves no catalog exists.
