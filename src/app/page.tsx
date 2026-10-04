import type { Metadata } from "next";
import { HomeView } from "./home-view";

export const metadata: Metadata = { title: { absolute: "TLTpulse · Projelerin seni anlatsın" } };

export default function Page() {
  return <HomeView />;
}
