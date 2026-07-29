// Next 16 publishes this runtime marker without a declaration file in the
// package version used by the deployment adapter. These types are consumed
// only by generated Next route validators.
declare module "next/types.js" {
  export type ResolvingMetadata = unknown;
  export type ResolvingViewport = unknown;
}
