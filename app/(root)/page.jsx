"use server";

import { motion } from "framer-motion";
import {
  Code2,
  Trophy,
  Users,
  Zap,
  ChevronRight,
  Play,
  Star,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { onBoardUser } from "@/modules/auth/actions";
import HomeView from ".";

export default async function Home() {
  await onBoardUser()

  return (
    <div>
      <HomeView />
    </div>
  )
}
