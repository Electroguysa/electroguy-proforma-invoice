import { getShopifyConfig } from "./config.mjs";

const ORDER_QUERY = `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }

  fragment AddressFields on MailingAddress {
    name
    company
    address1
    address2
    city
    province
    zip
    country
    phone
  }

  fragment OrderFields on Order {
    id
    name
    createdAt
    email
    phone
    currencyCode
    displayFinancialStatus
    displayFulfillmentStatus
    note
    customer {
      firstName
      lastName
      displayName
      email
      phone
    }
    billingAddress { ...AddressFields }
    shippingAddress { ...AddressFields }
    subtotalPriceSet { shopMoney { ...MoneyFields } }
    totalDiscountsSet { shopMoney { ...MoneyFields } }
    totalShippingPriceSet { shopMoney { ...MoneyFields } }
    totalTaxSet { shopMoney { ...MoneyFields } }
    totalPriceSet { shopMoney { ...MoneyFields } }
    lineItems(first: 100) {
      nodes {
        title
        quantity
        sku
        vendor
        variantTitle
        originalUnitPriceSet { shopMoney { ...MoneyFields } }
        discountedUnitPriceSet { shopMoney { ...MoneyFields } }
        discountedTotalSet { shopMoney { ...MoneyFields } }
        product {
          handle
          onlineStoreUrl
          featuredImage {
            url
            altText
          }
        }
      }
    }
    shippingLines(first: 10) {
      nodes {
        title
        discountedPriceSet { shopMoney { ...MoneyFields } }
      }
    }
  }
`;

export async function searchOrders(searchText) {
  const clean = String(searchText || "").trim();
  if (!clean) return [];

  const query = buildOrderSearch(clean);
  const data = await shopifyGraphql(`
    ${ORDER_QUERY}
    query SearchOrders($query: String!) {
      orders(first: 10, sortKey: CREATED_AT, reverse: true, query: $query) {
        nodes { ...OrderFields }
      }
    }
  `, { query });

  return data.orders.nodes.map(normalizeOrder);
}

export async function getOrderById(orderId) {
  const data = await shopifyGraphql(`
    ${ORDER_QUERY}
    query GetOrder($id: ID!) {
      order(id: $id) { ...OrderFields }
    }
  `, { id: orderId });
  if (!data.order) throw new Error("Order not found.");
  return normalizeOrder(data.order);
}

export async function findOrderByNameOrId(value) {
  const text = String(value || "").trim();
  if (!text) throw new Error("Order number or Shopify order ID is required.");
  if (text.startsWith("gid://shopify/Order/")) return getOrderById(text);
  const orders = await searchOrders(text);
  if (!orders.length) throw new Error(`No order found for "${text}".`);
  return orders[0];
}

function buildOrderSearch(input) {
  if (input.includes("@")) return `email:${JSON.stringify(input)}`;
  const orderNumber = input.startsWith("#") ? input : `#${input.replace(/^#/, "")}`;
  return `name:${JSON.stringify(orderNumber)} OR ${JSON.stringify(input)}`;
}

async function shopifyGraphql(query, variables = {}) {
  const { store, token, version } = getShopifyConfig();
  if (!token) {
    throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN. Add it in Vercel environment variables.");
  }

  const response = await fetch(`https://${store}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token
    },
    body: JSON.stringify({ query, variables })
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.map((error) => error.message).join("; ") || `Shopify API error ${response.status}`);
  }
  return payload.data;
}

function normalizeOrder(order) {
  const customerName = order.customer?.displayName || order.shippingAddress?.name || order.billingAddress?.name || "Customer";
  const currency = order.currencyCode || "ZAR";
  const lineItems = order.lineItems.nodes.map((item) => {
    const unit = money(item.discountedUnitPriceSet?.shopMoney) || money(item.originalUnitPriceSet?.shopMoney);
    const total = money(item.discountedTotalSet?.shopMoney) || unit * item.quantity;
    return {
      title: item.title,
      quantity: item.quantity,
      sku: item.sku || "",
      vendor: item.vendor || "",
      variantTitle: item.variantTitle || "",
      unitPrice: unit,
      lineTotal: total,
      productUrl: item.product?.onlineStoreUrl || (item.product?.handle ? `https://electroguy.co.za/products/${item.product.handle}` : ""),
      imageUrl: item.product?.featuredImage?.url || "",
      imageAlt: item.product?.featuredImage?.altText || item.title
    };
  });

  return {
    id: order.id,
    name: order.name,
    createdAt: order.createdAt,
    customerName,
    customerEmail: order.email || order.customer?.email || "",
    customerPhone: order.phone || order.customer?.phone || order.shippingAddress?.phone || "",
    currency,
    financialStatus: order.displayFinancialStatus,
    fulfillmentStatus: order.displayFulfillmentStatus,
    billingAddress: normalizeAddress(order.billingAddress),
    shippingAddress: normalizeAddress(order.shippingAddress),
    lineItems,
    shippingLines: order.shippingLines.nodes.map((line) => ({
      title: line.title,
      amount: money(line.discountedPriceSet?.shopMoney)
    })),
    subtotal: money(order.subtotalPriceSet?.shopMoney),
    discounts: money(order.totalDiscountsSet?.shopMoney),
    shipping: money(order.totalShippingPriceSet?.shopMoney),
    shopifyTax: money(order.totalTaxSet?.shopMoney),
    total: money(order.totalPriceSet?.shopMoney)
  };
}

function normalizeAddress(address) {
  if (!address) return null;
  return {
    name: address.name || "",
    company: address.company || "",
    address1: address.address1 || "",
    address2: address.address2 || "",
    city: address.city || "",
    province: address.province || "",
    zip: address.zip || "",
    country: address.country || "",
    phone: address.phone || ""
  };
}

function money(value) {
  return Number(value?.amount || 0);
}
