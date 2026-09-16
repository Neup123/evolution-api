# Baileys method contracts

These files are generated from the installed Baileys TypeScript declarations. Every route returns `{ method, result }`; local-first routes also set `X-Evolution-Data-Source` and may set `X-Evolution-Data-Age`.

- [Communities](./communities.md)
- [Business & catalog](./business.md)
- [Calls & messages](./messages.md)
- [Newsletters](./newsletters.md)
- [Groups](./groups.md)
- [Account & privacy](./account.md)
- [Advanced protocol](./advanced.md)

## Identifier model

Before storing or joining contacts, group members, messages, or channels, read [WhatsApp identifiers, contacts, groups, and channels](./identifiers.md). It explains PN (`@s.whatsapp.net`) versus LID (`@lid`), group (`@g.us`) and newsletter (`@newsletter`) conversation IDs, message `remoteJid`/`participant` fields, Evolution database IDs, and this fork's normalized participant fields.

In particular, group membership does **not** create a new person ID. The same WhatsApp person may appear through either their PN JID or LID depending on WhatsApp addressing and available mappings.
