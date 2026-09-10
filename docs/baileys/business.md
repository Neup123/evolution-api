# Business & catalog

Business profiles, catalogs, collections, and products.

## Get Order Details (`getOrderDetails`)

Retrieve order details using the connected WhatsApp account and return the server result.

`POST /baileys/business/getOrderDetails/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `orderId` | yes | string |
| `tokenBase64` | yes | string |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "price": {
      "type": "object",
      "properties": {
        "currency": {
          "type": "string",
          "description": "Currency code supplied by the catalog."
        },
        "total": {
          "type": "number",
          "description": "number"
        }
      },
      "required": [
        "currency",
        "total"
      ],
      "additionalProperties": false,
      "description": "Product or order price in the smallest unit defined by the currency contract."
    },
    "products": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Stable identifier in the namespace implied by its surrounding object."
          },
          "imageUrl": {
            "type": "string",
            "description": "string"
          },
          "name": {
            "type": "string",
            "description": "Human-visible name returned by WhatsApp."
          },
          "quantity": {
            "type": "number",
            "description": "number"
          },
          "currency": {
            "type": "string",
            "description": "Currency code supplied by the catalog."
          },
          "price": {
            "type": "number",
            "description": "Product or order price in the smallest unit defined by the currency contract."
          }
        },
        "required": [
          "id",
          "imageUrl",
          "name",
          "quantity",
          "currency",
          "price"
        ],
        "additionalProperties": false,
        "description": "OrderProduct"
      },
      "description": "Catalog product records returned for this page."
    }
  },
  "required": [
    "price",
    "products"
  ],
  "additionalProperties": false,
  "description": "OrderDetails"
}
```

## Get Catalog (`getCatalog`)

Get products from a WhatsApp Business catalog owner. Omit the owner JID for the connected account; group JIDs are invalid.

`POST /baileys/business/getCatalog/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `options` | yes | Catalog query: optional business owner PN JID, page size limit, and opaque next-page cursor. Omit jid for the connected account. |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "products": {
      "type": "array",
      "items": {
        "description": "Product"
      },
      "description": "Catalog product records returned for this page."
    },
    "nextPageCursor": {
      "type": "string",
      "description": "Opaque cursor for requesting the next catalog page; null means no next page."
    }
  },
  "required": [
    "products",
    "nextPageCursor"
  ],
  "additionalProperties": false,
  "description": "{ products: Product[]; nextPageCursor: string; }"
}
```

## Get Collections (`getCollections`)

Get the named product collections of a WhatsApp Business catalog owner. These are catalog collections, not chat groups.

`POST /baileys/business/getCollections/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | no | Optional WhatsApp Business catalog owner PN JID ending in @s.whatsapp.net. Omit it for the connected account. |
| `limit` | no | Maximum items WhatsApp should return for this request. |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "collections": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Stable identifier in the namespace implied by its surrounding object."
          },
          "name": {
            "type": "string",
            "description": "Human-visible name returned by WhatsApp."
          },
          "products": {
            "type": "array",
            "items": {
              "description": "Product"
            },
            "description": "Catalog product records returned for this page."
          },
          "status": {
            "type": "object",
            "additionalProperties": true,
            "description": "WhatsApp operation, delivery, membership, catalog, or account state for this record."
          }
        },
        "required": [
          "id",
          "name",
          "products",
          "status"
        ],
        "additionalProperties": false,
        "description": "CatalogCollection"
      },
      "description": "Named WhatsApp Business catalog collections."
    }
  },
  "required": [
    "collections"
  ],
  "additionalProperties": false,
  "description": "{ collections: CatalogCollection[]; }"
}
```

## Product Create (`productCreate`)

Execute the product create WhatsApp capability and return its typed result.

`POST /baileys/business/productCreate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `create` | yes | ProductCreate |

Response `result` structure:

```json
{
  "description": "Product"
}
```

## Product Delete (`productDelete`)

Execute the product delete WhatsApp capability and return its typed result.

`POST /baileys/business/productDelete/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `productIds` | yes | string[] |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "deleted": {
      "type": "number",
      "description": "number"
    }
  },
  "required": [
    "deleted"
  ],
  "additionalProperties": false,
  "description": "{ deleted: number; }"
}
```

## Product Update (`productUpdate`)

Execute the product update WhatsApp capability and return its typed result.

`POST /baileys/business/productUpdate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `productId` | yes | string |
| `update` | yes | ProductUpdate |

Response `result` structure:

```json
{
  "description": "Product"
}
```

## Update Bussines Profile (`updateBussinesProfile`)

Update bussines profile using the connected WhatsApp account and return the server result.

`POST /baileys/business/updateBussinesProfile/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `args` | yes | UpdateBussinesProfileProps |

Response `result` structure:

```json
{
  "description": "any"
}
```

## Update Cover Photo (`updateCoverPhoto`)

Update cover photo using the connected WhatsApp account and return the server result.

`POST /baileys/business/updateCoverPhoto/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `photo` | yes | WAMediaUpload |

Response `result` structure:

```json
{
  "type": "number",
  "description": "number"
}
```

## Remove Cover Photo (`removeCoverPhoto`)

Remove or revoke cover photo using the connected WhatsApp account and return the server result.

`POST /baileys/business/removeCoverPhoto/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `id` | yes | string |

Response `result` structure:

```json
{
  "description": "any"
}
```
