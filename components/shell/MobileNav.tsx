"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Mail, Users, User, FileText, MessageSquare, Target,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/email-outreach", label: "Email", icon: Mail },
  { href: "/influencer-outreach", label: "Influencer", icon: Users },
  { href: "/personal-outreach", label: "Personal", icon: User },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/comment-hacking", label: "Comments", icon: MessageSquare },
  { href: "/paid-ads", label: "Paid Ads", icon: Target },
];

export function MobileNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="mobile-nav">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`mobile-nav-item${active ? " active" : ""}`}
          >
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
