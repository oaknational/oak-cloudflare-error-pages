locals {
  workspace_prefix = "static-error-page-project-"
}

resource "terraform_data" "workspace_validation" {
  lifecycle {
    precondition {
      condition     = startswith(terraform.workspace, local.workspace_prefix)
      error_message = "Workspace name \"${terraform.workspace}\" must begin with ${local.workspace_prefix}"
    }
  }
}

module "vercel" {
  source                           = "github.com/oaknational/oak-terraform-modules//modules/vercel_project?ref=v1.2.6"
  build_type                       = "cloudflare"
  cloudflare_zone_domain           = var.cloudflare_zone_domain
  framework                        = null
  deployment_type                  = "standard_protection"
  git_repo                         = "oaknational/static-website-error-pages-2022"
  protection_bypass_for_automation = false
  skew_protection                  = "1 day"
}