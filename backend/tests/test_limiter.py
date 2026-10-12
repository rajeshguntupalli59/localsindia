from starlette.requests import Request

from app.core.limiter import client_ip


def _req(headers: dict[str, str], peer: str = "169.254.130.1") -> Request:
    return Request({
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "client": (peer, 1234),
    })


def test_uses_azure_client_ip_header():
    assert client_ip(_req({"X-Client-IP": "107.4.188.93", "X-Forwarded-For": "107.4.188.93:53511"})) == "107.4.188.93"


def test_falls_back_to_last_forwarded_for_entry_without_port():
    # A client-sent (forgeable) entry comes first; Azure appends the real one last
    assert client_ip(_req({"X-Forwarded-For": "6.6.6.6, 107.4.188.93:53511"})) == "107.4.188.93"


def test_keeps_ipv6_forwarded_for_intact():
    assert client_ip(_req({"X-Forwarded-For": "2601:447::a080"})) == "2601:447::a080"


def test_falls_back_to_socket_peer():
    assert client_ip(_req({}, peer="10.0.0.5")) == "10.0.0.5"


def test_different_visitors_get_different_keys():
    a = client_ip(_req({"X-Client-IP": "1.1.1.1"}))
    b = client_ip(_req({"X-Client-IP": "2.2.2.2"}))
    assert a != b
