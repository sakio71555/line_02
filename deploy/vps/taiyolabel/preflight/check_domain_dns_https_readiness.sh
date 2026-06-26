#!/usr/bin/env sh
set -eu

DOMAIN=""
HOSTNAME_TARGET=""
EXPECTED_IP=""

usage() {
  cat <<'USAGE'
Usage:
  check_domain_dns_https_readiness.sh --domain example.com [--host example.com] [--expected-ip 203.0.113.10]

Safe read-only checks only:
  - validates that placeholders are not used as real hostnames
  - prints DNS A/AAAA summaries when dig is available
  - prints local Nginx, listener, and certificate-tool availability summaries
  - does not perform HTTP requests or change system configuration
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --host)
      HOSTNAME_TARGET="${2:-}"
      shift 2
      ;;
    --expected-ip)
      EXPECTED_IP="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "FAIL unknown argument: $1"
      usage
      exit 2
      ;;
  esac
done

is_placeholder() {
  case "$1" in
    ""|"_CHANGE_ME_"|"localhost"|"127.0.0.1"|"::1"|*.invalid)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

check_name() {
  label="$1"
  value="$2"

  if is_placeholder "$value"; then
    echo "FAIL ${label} is not an approved real hostname: ${value:-<empty>}"
    return 1
  fi

  echo "PASS ${label}: ${value}"
  return 0
}

overall_status=0

check_name "domain" "$DOMAIN" || overall_status=1

if [ -n "$HOSTNAME_TARGET" ]; then
  check_name "host" "$HOSTNAME_TARGET" || overall_status=1
else
  HOSTNAME_TARGET="$DOMAIN"
  echo "INFO host not supplied; using domain for DNS summary"
fi

if command -v dig >/dev/null 2>&1; then
  if ! is_placeholder "$HOSTNAME_TARGET"; then
    echo "INFO DNS A records for ${HOSTNAME_TARGET}:"
    dig +short A "$HOSTNAME_TARGET" || true
    echo "INFO DNS AAAA records for ${HOSTNAME_TARGET}:"
    dig +short AAAA "$HOSTNAME_TARGET" || true

    if [ -n "$EXPECTED_IP" ]; then
      if dig +short A "$HOSTNAME_TARGET" | grep -Fx "$EXPECTED_IP" >/dev/null 2>&1; then
        echo "PASS expected IPv4 address is present"
      else
        echo "FAIL expected IPv4 address is not present"
        overall_status=1
      fi
    fi
  fi
else
  echo "SKIP dig is not available"
fi

if command -v nginx >/dev/null 2>&1; then
  nginx -v 2>&1 || true
  nginx -t
else
  echo "SKIP nginx is not available"
fi

if command -v ss >/dev/null 2>&1; then
  echo "INFO listener summary for ports 80, 443, 3002, and 8788:"
  ss -ltnp | grep -E ':(80|443|3002|8788)\b' || true
else
  echo "SKIP ss is not available"
fi

if command -v certbot >/dev/null 2>&1; then
  certbot --version || true
else
  echo "SKIP certbot is not available"
fi

if command -v systemctl >/dev/null 2>&1; then
  systemctl list-timers --all | grep -Ei 'certbot|acme|letsencrypt' || true
else
  echo "SKIP systemctl is not available"
fi

exit "$overall_status"
