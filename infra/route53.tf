# Data source: look up the EXISTING hosted zone for nikhilv.net.
# The hosted zone must already exist — Terraform will not create it.

data "aws_route53_zone" "main" {
  name         = "${var.domain}."
  private_zone = false
}

# A alias record: finance.nikhilv.net → ALB

resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.fqdn
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
