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
  source                           = "github.com/oaknational/oak-terraform-modules//modules/vercel_project?ref=v2.1.0"
  build_type                       = "cloudflare"
  cloudflare_zone_domain           = var.cloudflare_zone_domain
  framework                        = "other"
  project_visibility               = "public"
  git_repo                         = "oaknational/static-website-error-pages-2022"
  protection_bypass_for_automation = false
  skew_protection                  = "1 day"
}
