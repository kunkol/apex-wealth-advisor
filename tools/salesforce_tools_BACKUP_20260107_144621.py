"""
Salesforce Tools for Apex Wealth Advisor
Provides Salesforce API operations using Token Vault tokens

All operations verified working in notebook:
- READ: Contact search, opportunity queries, pipeline aggregations
- WRITE: Create tasks, create notes, update opportunity stages
"""

import logging
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Salesforce instance URL (from your org)
SF_INSTANCE_URL = "https://orgfarm-2771b5c595-dev-ed.develop.my.salesforce.com"


async def search_contacts(
    access_token: str,
    search_term: str,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search for contacts by name
    Demo Prompt 2.1: "Look up Marcus Thompson in Salesforce"
    """
    try:
        # SOSL search for contacts
        sosl_query = f"FIND {{{search_term}}} IN NAME FIELDS RETURNING Contact(Id, Name, Email, Phone, Title, Account.Name) LIMIT {limit}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SF_INSTANCE_URL}/services/data/v59.0/search/",
                params={"q": sosl_query},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                contacts = data.get("searchRecords", [])
                return {
                    "success": True,
                    "contacts": contacts,
                    "count": len(contacts),
                    "search_term": search_term
                }
            else:
                logger.error(f"[Salesforce] Contact search failed: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"Search failed: {response.status_code}",
                    "details": response.text
                }
    except Exception as e:
        logger.error(f"[Salesforce] Contact search error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


async def create_contact(
    access_token: str,
    first_name: str,
    last_name: str,
    email: str = None,
    phone: str = None,
    title: str = None,
    account_name: str = None,
    description: str = None
) -> Dict[str, Any]:
    """
    Create a new contact in Salesforce
    Demo Prompt: "Create a new contact for James Chen at Chen Industries"
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # If account_name provided, look up or create the account
            account_id = None
            if account_name:
                account_soql = f"SELECT Id, Name FROM Account WHERE Name LIKE '%{account_name}%' LIMIT 1"
                account_response = await client.get(
                    f"{SF_INSTANCE_URL}/services/data/v59.0/query/",
                    params={"q": account_soql},
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                if account_response.status_code == 200:
                    accounts = account_response.json().get("records", [])
                    if accounts:
                        account_id = accounts[0]["Id"]
                        logger.info(f"[Salesforce] Found account: {accounts[0]['Name']} ({account_id})")
                    else:
                        # Create the account if it doesn't exist
                        logger.info(f"[Salesforce] Account '{account_name}' not found, creating it...")
                        account_create_response = await client.post(
                            f"{SF_INSTANCE_URL}/services/data/v59.0/sobjects/Account/",
                            json={"Name": account_name},
                            headers={
                                "Authorization": f"Bearer {access_token}",
                                "Content-Type": "application/json"
                            }
                        )
                        if account_create_response.status_code == 201:
                            account_id = account_create_response.json().get("id")
                            logger.info(f"[Salesforce] Created account: {account_name} ({account_id})")
            
            # Build contact data
            contact_data = {
                "FirstName": first_name,
                "LastName": last_name
            }
            if email:
                contact_data["Email"] = email
            if phone:
                contact_data["Phone"] = phone
            if title:
                contact_data["Title"] = title
            if account_id:
                contact_data["AccountId"] = account_id
            if description:
                contact_data["Description"] = description
            
            # Create the contact
            response = await client.post(
                f"{SF_INSTANCE_URL}/services/data/v59.0/sobjects/Contact/",
                json=contact_data,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 201:
                contact_id = response.json().get("id")
                logger.info(f"[Salesforce] SUCCESS: Created contact: {first_name} {last_name} ({contact_id})")
                return {
                    "success": True,
                    "contact_id": contact_id,
                    "name": f"{first_name} {last_name}",
                    "email": email,
                    "phone": phone,
                    "account": account_name,
                    "message": f"Successfully created contact '{first_name} {last_name}' in Salesforce"
                }
            else:
                logger.error(f"[Salesforce] Contact creation failed: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"Contact creation failed: {response.status_code}",
                    "details": response.text
                }
    except Exception as e:
        logger.error(f"[Salesforce] Contact creation error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


async def get_contact_opportunities(
    access_token: str,
    contact_name: str
) -> Dict[str, Any]:
    """
    Get opportunities associated with a contact
    Demo Prompt 2.2: "What opportunities do we have with Thompson?"
    """
    try:
        # First find the contact's account
        soql = f"""
            SELECT Id, Name, Account.Id, Account.Name 
            FROM Contact 
            WHERE Name LIKE '%{contact_name}%' 
            LIMIT 1
        """
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get contact
            response = await client.get(
                f"{SF_INSTANCE_URL}/services/data/v59.0/query/",
                params={"q": soql},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                return {"success": False, "error": f"Contact lookup failed: {response.status_code}"}
            
            contacts = response.json().get("records", [])
            if not contacts:
                return {"success": False, "error": f"No contact found matching '{contact_name}'"}
            
            contact = contacts[0]
            account_id = contact.get("Account", {}).get("Id")
            
            if not account_id:
                return {"success": False, "error": "Contact has no associated account"}
            
            # Get opportunities for this account
            opp_soql = f"""
                SELECT Id, Name, Amount, StageName, CloseDate, Probability
                FROM Opportunity
                WHERE AccountId = '{account_id}'
                ORDER BY CloseDate DESC
            """
            
            opp_response = await client.get(
                f"{SF_INSTANCE_URL}/services/data/v59.0/query/",
                params={"q": opp_soql},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if opp_response.status_code == 200:
                opps = opp_response.json().get("records", [])
                return {
                    "success": True,
                    "contact": {
                        "name": contact.get("Name"),
                        "account": contact.get("Account", {}).get("Name")
                    },
                    "opportunities": opps,
                    "count": len(opps)
                }
            else:
                return {"success": False, "error": f"Opportunity query failed: {opp_response.status_code}"}
                
    except Exception as e:
        logger.error(f"[Salesforce] Opportunity lookup error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


async def get_sales_pipeline(
    access_token: str,
    stage_filter: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get sales pipeline summary
    Demo Prompt 2.4: "Show me the current sales pipeline"
    """
    try:
        where_clause = f"WHERE StageName = '{stage_filter}'" if stage_filter else ""
        
        soql = f"""
            SELECT StageName, COUNT(Id) num, SUM(Amount) total
            FROM Opportunity
            {where_clause}
            GROUP BY StageName
            ORDER BY StageName
        """
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SF_INSTANCE_URL}/services/data/v59.0/query/",
                params={"q": soql},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code == 200:
                records = response.json().get("records", [])
                
                # Calculate totals
                total_count = sum(r.get("num", 0) for r in records)
                total_value = sum(r.get("total", 0) or 0 for r in records)
                
                return {
                    "success": True,
                    "pipeline": records,
                    "summary": {
                        "total_opportunities": total_count,
                        "total_value": total_value,
                        "stages": len(records)
                    }
                }
            else:
                return {"success": False, "error": f"Pipeline query failed: {response.status_code}"}
                
    except Exception as e:
        logger.error(f"[Salesforce] Pipeline query error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


async def get_high_value_accounts(
    access_token: str,
    min_amount: float = 500000
) -> Dict[str, Any]:
    """
    Get high-value accounts/opportunities
    Demo Prompt 2.5: "Which clients have opportunities over $500K?"
    """
    try:
        soql = f"""
            SELECT Account.Name, Name, Amount, StageName, CloseDate
            FROM Opportunity
            WHERE Amount >= {min_amount}
            ORDER BY Amount DESC
        """
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SF_INSTANCE_URL}/services/data/v59.0/query/",
                params={"q": soql},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code == 200:
                records = response.json().get("records", [])
                return {
                    "success": True,
                    "high_value_opportunities": records,
                    "count": len(records),
                    "threshold": min_amount
                }
            else:
                return {"success": False, "error": f"Query failed: {response.status_code}"}
                
    except Exception as e:
        logger.error(f"[Salesforce] High value query error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


async def create_task(
    access_token: str,
    subject: str,
    contact_name: str,
    due_date: Optional[str] = None,
    description: Optional[str] = None,
    priority: str = "Normal"
) -> Dict[str, Any]:
    """
    Create a follow-up task
    Demo Prompt 2.6: "Create a follow-up task for Marcus Thompson"
    """
    try:
        # First find the contact
        soql = f"SELECT Id, Name FROM Contact WHERE Name LIKE '%{contact_name}%' LIMIT 1"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SF_INSTANCE_URL}/services/data/v59.0/query/",
                params={"q": soql},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                return {"success": False, "error": f"Contact lookup failed: {response.status_code}"}
            
            contacts = response.json().get("records", [])
            if not contacts:
                return {"success": False, "error": f"No contact found matching '{contact_name}'"}
            
            contact_id = contacts[0]["Id"]
            
            # Create the task
            task_data = {
                "Subject": subject,
                "WhoId": contact_id,
                "Priority": priority,
                "Status": "Not Started"
            }
            
            if due_date:
                task_data["ActivityDate"] = due_date
            if description:
                task_data["Description"] = description
            
            create_response = await client.post(
                f"{SF_INSTANCE_URL}/services/data/v59.0/sobjects/Task",
                json=task_data,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if create_response.status_code == 201:
                result = create_response.json()
                return {
                    "success": True,
                    "task_id": result.get("id"),
                    "message": f"Task '{subject}' created for {contacts[0]['Name']}"
                }
            else:
                return {"success": False, "error": f"Task creation failed: {create_response.status_code}"}
                
    except Exception as e:
        logger.error(f"[Salesforce] Task creation error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


async def create_note(
    access_token: str,
    account_name: str,
    title: str,
    body: str
) -> Dict[str, Any]:
    """
    Add a note to an account
    Demo Prompt 2.7: "Add a note to Chen's account"
    """
    try:
        # Find the account
        soql = f"SELECT Id, Name FROM Account WHERE Name LIKE '%{account_name}%' LIMIT 1"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SF_INSTANCE_URL}/services/data/v59.0/query/",
                params={"q": soql},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                return {"success": False, "error": f"Account lookup failed: {response.status_code}"}
            
            accounts = response.json().get("records", [])
            if not accounts:
                return {"success": False, "error": f"No account found matching '{account_name}'"}
            
            account_id = accounts[0]["Id"]
            
            # Create ContentNote (modern approach)
            note_data = {
                "Title": title,
                "Content": body
            }
            
            # Use Note object (classic approach that works better)
            note_data = {
                "Title": title,
                "Body": body,
                "ParentId": account_id
            }
            
            create_response = await client.post(
                f"{SF_INSTANCE_URL}/services/data/v59.0/sobjects/Note",
                json=note_data,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if create_response.status_code == 201:
                result = create_response.json()
                return {
                    "success": True,
                    "note_id": result.get("id"),
                    "message": f"Note '{title}' added to {accounts[0]['Name']}"
                }
            else:
                return {"success": False, "error": f"Note creation failed: {create_response.status_code}"}
                
    except Exception as e:
        logger.error(f"[Salesforce] Note creation error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


async def get_pipeline_value(
    access_token: str
) -> Dict[str, Any]:
    """
    Get total pipeline value
    Demo Prompt 2.8: "What's the total pipeline value?"
    """
    try:
        soql = """
            SELECT SUM(Amount) total, COUNT(Id) count
            FROM Opportunity
            WHERE IsClosed = false
        """
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SF_INSTANCE_URL}/services/data/v59.0/query/",
                params={"q": soql},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code == 200:
                records = response.json().get("records", [])
                if records:
                    return {
                        "success": True,
                        "total_value": records[0].get("total", 0),
                        "opportunity_count": records[0].get("count", 0)
                    }
                return {"success": True, "total_value": 0, "opportunity_count": 0}
            else:
                return {"success": False, "error": f"Query failed: {response.status_code}"}
                
    except Exception as e:
        logger.error(f"[Salesforce] Pipeline value error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


async def update_opportunity_stage(
    access_token: str,
    opportunity_name: str,
    new_stage: str
) -> Dict[str, Any]:
    """
    Update an opportunity's stage
    Demo Prompt 2.10: "Update Rodriguez opportunity to Negotiation"
    """
    try:
        # Find the opportunity
        soql = f"SELECT Id, Name, StageName FROM Opportunity WHERE Name LIKE '%{opportunity_name}%' LIMIT 1"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SF_INSTANCE_URL}/services/data/v59.0/query/",
                params={"q": soql},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                return {"success": False, "error": f"Opportunity lookup failed: {response.status_code}"}
            
            opps = response.json().get("records", [])
            if not opps:
                return {"success": False, "error": f"No opportunity found matching '{opportunity_name}'"}
            
            opp = opps[0]
            opp_id = opp["Id"]
            old_stage = opp["StageName"]
            
            # Update the stage
            update_response = await client.patch(
                f"{SF_INSTANCE_URL}/services/data/v59.0/sobjects/Opportunity/{opp_id}",
                json={"StageName": new_stage},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if update_response.status_code == 204:
                return {
                    "success": True,
                    "opportunity": opp["Name"],
                    "old_stage": old_stage,
                    "new_stage": new_stage,
                    "message": f"Updated '{opp['Name']}' from {old_stage} to {new_stage}"
                }
            else:
                return {"success": False, "error": f"Update failed: {update_response.status_code}"}
                
    except Exception as e:
        logger.error(f"[Salesforce] Stage update error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


# Tool definitions for Claude
SALESFORCE_TOOLS = [
    {
        "name": "search_salesforce_contacts",
        "description": "Search for contacts in Salesforce by name. Returns contact details including email, phone, title, and associated account.",
        "input_schema": {
            "type": "object",
            "properties": {
                "search_term": {
                    "type": "string",
                    "description": "Name or partial name to search for"
                }
            },
            "required": ["search_term"]
        }
    },
    {
        "name": "get_contact_opportunities",
        "description": "Get all opportunities associated with a contact's account. Shows opportunity name, amount, stage, and close date.",
        "input_schema": {
            "type": "object",
            "properties": {
                "contact_name": {
                    "type": "string",
                    "description": "Name of the contact to look up opportunities for"
                }
            },
            "required": ["contact_name"]
        }
    },
    {
        "name": "get_sales_pipeline",
        "description": "Get the current sales pipeline summary grouped by stage. Shows count and total value for each stage.",
        "input_schema": {
            "type": "object",
            "properties": {
                "stage_filter": {
                    "type": "string",
                    "description": "Optional: Filter to a specific stage"
                }
            }
        }
    },
    {
        "name": "get_high_value_accounts",
        "description": "Get opportunities above a certain value threshold. Default is $500,000.",
        "input_schema": {
            "type": "object",
            "properties": {
                "min_amount": {
                    "type": "number",
                    "description": "Minimum opportunity amount (default: 500000)"
                }
            }
        }
    },
    {
        "name": "create_salesforce_task",
        "description": "Create a follow-up task for a contact in Salesforce.",
        "input_schema": {
            "type": "object",
            "properties": {
                "subject": {
                    "type": "string",
                    "description": "Task subject/title"
                },
                "contact_name": {
                    "type": "string",
                    "description": "Name of the contact to associate the task with"
                },
                "due_date": {
                    "type": "string",
                    "description": "Due date in YYYY-MM-DD format"
                },
                "description": {
                    "type": "string",
                    "description": "Task description/notes"
                },
                "priority": {
                    "type": "string",
                    "enum": ["High", "Normal", "Low"],
                    "description": "Task priority"
                }
            },
            "required": ["subject", "contact_name"]
        }
    },
    {
        "name": "create_salesforce_note",
        "description": "Add a note to an account in Salesforce.",
        "input_schema": {
            "type": "object",
            "properties": {
                "account_name": {
                    "type": "string",
                    "description": "Name of the account to add the note to"
                },
                "title": {
                    "type": "string",
                    "description": "Note title"
                },
                "body": {
                    "type": "string",
                    "description": "Note content"
                }
            },
            "required": ["account_name", "title", "body"]
        }
    },
    {
        "name": "get_pipeline_value",
        "description": "Get the total value and count of all open opportunities in the pipeline.",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "update_opportunity_stage",
        "description": "Update the stage of an opportunity. Common stages: Prospecting, Qualification, Needs Analysis, Value Proposition, Id. Decision Makers, Perception Analysis, Proposal/Price Quote, Negotiation/Review, Closed Won, Closed Lost.",
        "input_schema": {
            "type": "object",
            "properties": {
                "opportunity_name": {
                    "type": "string",
                    "description": "Name or partial name of the opportunity"
                },
                "new_stage": {
                    "type": "string",
                    "description": "New stage to set"
                }
            },
            "required": ["opportunity_name", "new_stage"]
        }
    },
    {
        "name": "create_salesforce_contact",
        "description": "Create a new contact in Salesforce. Can optionally associate with an existing account or create a new one.",
        "input_schema": {
            "type": "object",
            "properties": {
                "first_name": {
                    "type": "string",
                    "description": "Contact's first name"
                },
                "last_name": {
                    "type": "string",
                    "description": "Contact's last name"
                },
                "email": {
                    "type": "string",
                    "description": "Contact's email address"
                },
                "phone": {
                    "type": "string",
                    "description": "Contact's phone number"
                },
                "title": {
                    "type": "string",
                    "description": "Contact's job title"
                },
                "account_name": {
                    "type": "string",
                    "description": "Company/Account name to associate the contact with"
                },
                "description": {
                    "type": "string",
                    "description": "Additional notes about the contact"
                }
            },
            "required": ["first_name", "last_name"]
        }
    }
]


class SalesforceTools:
    """
    Salesforce Tools wrapper class for the demo.
    Provides list_tools() and call_tool() interface for Claude service integration.
    """
    
    def __init__(self):
        self.tools = SALESFORCE_TOOLS
    
    def list_tools(self) -> List[Dict]:
        """Return list of available Salesforce tools"""
        return self.tools
    
    async def call_tool(self, tool_name: str, args: Dict[str, Any], access_token: str = None) -> Dict[str, Any]:
        """Execute a Salesforce tool"""
        
        if not access_token:
            return {"error": "No Salesforce access token provided"}
        
        tool_handlers = {
            "search_salesforce_contacts": lambda: search_contacts(access_token, args.get("search_term", "")),
            "create_salesforce_contact": lambda: create_contact(
                access_token,
                args.get("first_name", ""),
                args.get("last_name", ""),
                args.get("email"),
                args.get("phone"),
                args.get("title"),
                args.get("account_name"),
                args.get("description")
            ),
            "get_contact_opportunities": lambda: get_contact_opportunities(access_token, args.get("contact_name", "")),
            "get_sales_pipeline": lambda: get_sales_pipeline(access_token, args.get("stage_filter")),
            "get_high_value_accounts": lambda: get_high_value_accounts(access_token, args.get("min_amount", 500000)),
            "create_salesforce_task": lambda: create_task(
                access_token,
                args.get("subject", ""),
                args.get("contact_name", ""),
                args.get("due_date"),
                args.get("description"),
                args.get("priority", "Normal")
            ),
            "create_salesforce_note": lambda: create_note(
                access_token,
                args.get("account_name", ""),
                args.get("title", ""),
                args.get("body", "")
            ),
            "get_pipeline_value": lambda: get_pipeline_value(access_token),
            "update_opportunity_stage": lambda: update_opportunity_stage(
                access_token,
                args.get("opportunity_name", ""),
                args.get("new_stage", "")
            )
        }
        
        handler = tool_handlers.get(tool_name)
        if not handler:
            return {"error": f"Unknown Salesforce tool: {tool_name}"}
        
        try:
            result = await handler()
            result["source"] = "Salesforce (via Auth0 Token Vault)"
            return result
        except Exception as e:
            logger.error(f"[Salesforce] Tool execution error: {e}", exc_info=True)
            return {"error": str(e)}
