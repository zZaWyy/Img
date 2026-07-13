"""Cliente mínimo de la API de Google Business Profile.

Usa OAuth2 con refresh token. Endpoints:
  - Cuentas:     mybusinessaccountmanagement.googleapis.com (v1)
  - Ubicaciones: mybusinessbusinessinformation.googleapis.com (v1)
  - Reseñas:     mybusiness.googleapis.com (v4, sigue siendo el endpoint
                 vigente para listar y responder reseñas)
"""

import os

import requests

TOKEN_URL = "https://oauth2.googleapis.com/token"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
SCOPE = "https://www.googleapis.com/auth/business.manage"

ACCOUNTS_API = "https://mybusinessaccountmanagement.googleapis.com/v1"
LOCATIONS_API = "https://mybusinessbusinessinformation.googleapis.com/v1"
REVIEWS_API = "https://mybusiness.googleapis.com/v4"


class GBPClient:
    def __init__(self):
        self.client_id = os.environ["GBP_CLIENT_ID"]
        self.client_secret = os.environ["GBP_CLIENT_SECRET"]
        self.refresh_token = os.environ["GBP_REFRESH_TOKEN"]
        self._access_token = None

    # --- auth ---

    def _token(self) -> str:
        if self._access_token is None:
            resp = requests.post(TOKEN_URL, data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": self.refresh_token,
                "grant_type": "refresh_token",
            }, timeout=30)
            resp.raise_for_status()
            self._access_token = resp.json()["access_token"]
        return self._access_token

    def _get(self, url: str, params: dict = None) -> dict:
        resp = requests.get(url, params=params or {}, timeout=30,
                            headers={"Authorization": f"Bearer {self._token()}"})
        resp.raise_for_status()
        return resp.json()

    # --- API ---

    def list_accounts(self) -> list:
        return self._get(f"{ACCOUNTS_API}/accounts").get("accounts", [])

    def list_locations(self, account_name: str) -> list:
        """account_name: 'accounts/123'. Devuelve [{name, title}, ...]."""
        locations, page_token = [], None
        while True:
            params = {"readMask": "name,title", "pageSize": 100}
            if page_token:
                params["pageToken"] = page_token
            data = self._get(f"{LOCATIONS_API}/{account_name}/locations", params)
            locations.extend(data.get("locations", []))
            page_token = data.get("nextPageToken")
            if not page_token:
                return locations

    def list_reviews(self, account_name: str, location_name: str) -> list:
        """location_name: 'locations/456'. Devuelve reseñas (más recientes primero)."""
        reviews, page_token = [], None
        url = f"{REVIEWS_API}/{account_name}/{location_name}/reviews"
        while True:
            params = {"pageSize": 50}
            if page_token:
                params["pageToken"] = page_token
            data = self._get(url, params)
            reviews.extend(data.get("reviews", []))
            page_token = data.get("nextPageToken")
            if not page_token:
                return reviews

    def reply_to_review(self, review_name: str, comment: str) -> dict:
        """review_name: 'accounts/123/locations/456/reviews/789'."""
        resp = requests.put(
            f"{REVIEWS_API}/{review_name}/reply",
            json={"comment": comment},
            timeout=30,
            headers={"Authorization": f"Bearer {self._token()}"},
        )
        resp.raise_for_status()
        return resp.json()


def interactive_auth():
    """Flujo manual para obtener el GBP_REFRESH_TOKEN (se ejecuta una sola vez)."""
    client_id = os.environ["GBP_CLIENT_ID"]
    client_secret = os.environ["GBP_CLIENT_SECRET"]
    redirect = "urn:ietf:wg:oauth:2.0:oob"
    url = (f"{AUTH_URL}?client_id={client_id}&redirect_uri={redirect}"
           f"&response_type=code&scope={SCOPE}&access_type=offline&prompt=consent")
    print("1) Abre esta URL en el navegador con la cuenta propietaria de las fichas:\n")
    print(url)
    code = input("\n2) Pega aquí el código de autorización: ").strip()
    resp = requests.post(TOKEN_URL, data={
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect,
        "grant_type": "authorization_code",
    }, timeout=30)
    resp.raise_for_status()
    print("\nGuarda esto como GBP_REFRESH_TOKEN:\n")
    print(resp.json()["refresh_token"])
