# server.py
from mcp.server.fastmcp import FastMCP
import requests

# Create an MCP server
mcp = FastMCP("Demo")


# Add an addition tool
@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b


# Add a dynamic greeting resource
@mcp.resource("greeting://{name}")
def get_greeting(name: str) -> str:
    """Get a personalized greeting"""
    return f"Hello, {name}!"

APHARK_KIOSK_API = "http://localhost:3001/api"

@mcp.tool()
def list_medicines() -> list:
    """List all available medicines in the pharmacy kiosk."""
    resp = requests.get(f"{APHARK_KIOSK_API}/medicines")
    resp.raise_for_status()
    return resp.json()

@mcp.tool()
def add_medicine_to_cart(medicine_id: int) -> dict:
    """Add a medicine to the cart by its ID in the pharmacy kiosk."""
    resp = requests.post(f"{APHARK_KIOSK_API}/cart", json={"id": medicine_id})
    resp.raise_for_status()
    return resp.json()

@mcp.tool()
def view_cart() -> list:
    """View the current cart in the pharmacy kiosk."""
    resp = requests.get(f"{APHARK_KIOSK_API}/cart")
    resp.raise_for_status()
    return resp.json()

@mcp.tool()
def get_receipt(purchase: dict) -> str:
    """Generate a formatted receipt for a purchase."""
    items = purchase.get('items', [])
    total = purchase.get('total', 0)
    lines = ["RECEIPT:"]
    for item in items:
        lines.append(f"- {item['name']} x{item['quantity']} @ ${item['price']} each = ${item['price']*item['quantity']}")
    lines.append(f"Total: ${total}")
    return '\n'.join(lines)

@mcp.tool()
def place_purchase() -> dict:
    """Place a pseudo purchase for the items currently in the cart in the pharmacy kiosk and return a receipt."""
    resp = requests.post(f"{APHARK_KIOSK_API}/purchase")
    resp.raise_for_status()
    purchase = resp.json()
    receipt = get_receipt(purchase.get('purchase', {})) if purchase.get('success') else None
    purchase['receipt'] = receipt
    return purchase