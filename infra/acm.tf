# ACM certificate for finance.nikhilv.net validated via Route 53 DNS records.
# For ALBs, the cert must be in the same region as the ALB (us-east-1 here).

resource "aws_acm_certificate" "app" {
  domain_name       = local.fqdn
  validation_method = "DNS"

  lifecycle {
    # Create the replacement cert before destroying the existing one
    # to avoid downtime during cert rotation/renewal.
    create_before_destroy = true
  }

  tags = {
    Name = local.fqdn
  }
}

# Route 53 DNS validation records.
# for_each handles multiple CNAME records if SANs are added later.

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.app.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for ACM to confirm ISSUED before attaching to the HTTPS listener

resource "aws_acm_certificate_validation" "app" {
  certificate_arn         = aws_acm_certificate.app.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
