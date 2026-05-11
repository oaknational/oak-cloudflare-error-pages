terraform {
  cloud {
    organization = "oak-national-academy"
    workspaces {
      tags = ["repo:static-website-error-pages-2022", "config:project"]
    }
  }
}
