# Data source: look up the EXISTING hosted zone for nikhilv.net.
# The hosted zone must already exist — Terraform will not create it.

data "aws_route53_zone" "main" {
  name         = "${var.domain}."
  private_zone = false
}

# Amplify issues an ACM cert for the custom domain and emits a verification CNAME.
# The format of certificate_verification_dns_record is "name CNAME value".
locals {
  cert_parts      = split(" ", aws_amplify_domain_association.main.certificate_verification_dns_record)
  subdomain_parts = split(" ", tolist(aws_amplify_domain_association.main.sub_domain)[0].dns_record)
}

resource "aws_route53_record" "amplify_cert_verification" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.cert_parts[0]
  type    = local.cert_parts[1]
  ttl     = 300
  records = [local.cert_parts[2]]
}

# finance.nikhilv.net → Amplify CloudFront distribution
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.subdomain_parts[0]
  type    = local.subdomain_parts[1]
  ttl     = 300
  records = [local.subdomain_parts[2]]
}
