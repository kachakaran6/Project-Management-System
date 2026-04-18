import { forwardRef } from "react";
import {
  Link as ReactRouterLink,
  type LinkProps as ReactRouterLinkProps,
} from "react-router-dom";

type NextLikeLinkProps = Omit<ReactRouterLinkProps, "to"> & {
  href: ReactRouterLinkProps["to"];
  prefetch?: boolean;
  scroll?: boolean;
};

const Link = forwardRef<HTMLAnchorElement, NextLikeLinkProps>(
  ({ href, prefetch: _prefetch, scroll: _scroll, ...props }, ref) => {
    return <ReactRouterLink ref={ref} to={href} {...props} />;
  },
);

Link.displayName = "Link";

export default Link;
