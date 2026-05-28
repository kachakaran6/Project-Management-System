"use client";

import { useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useProfileAnalytics } from "@/features/github/hooks/use-github";
import { ProfileAnalyticsSkeleton } from "@/components/ui/loading-system";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Users, UserPlus, BookOpen, Star, Building2, MapPin, Link as LinkIcon, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { GithubAnalyticsDashboard } from "@/features/github/components/analytics/github-analytics-dashboard";

export default function ProfileAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const username = params.username as string;
  const isDark = resolvedTheme === "dark";

  const { data, isLoading, error } = useProfileAnalytics(username);

  if (isLoading) {
    return <ProfileAnalyticsSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-destructive">Error Loading Profile</h2>
        <p className="text-muted-foreground">Could not fetch analytics for {username}. Please try again.</p>
        <Button onClick={() => router.push("/github")}>Go Back</Button>
      </div>
    );
  }

  const { profile, repos } = data;

  // Prepare chart data for top languages
  const languageCounts = repos.reduce((acc: any, repo: any) => {
    if (repo.language) {
      acc[repo.language] = (acc[repo.language] || 0) + 1;
    }
    return acc;
  }, {});

  const languageData = Object.entries(languageCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 5); // Top 5 languages

  const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  // Total stars calculation
  const totalStars = repos.reduce((sum: number, repo: any) => sum + repo.stargazers_count, 0);

  return (
    <div className="flex flex-col h-full bg-background relative w-full">
      <div className="flex items-center gap-4 py-3 px-4 border-b border-border/20 sticky top-0 bg-background/95 backdrop-blur z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/github")}
          className="size-8 rounded-button hover:bg-muted/50"
        >
          <ArrowLeft className="size-4 text-muted-foreground" />
        </Button>
        <h1 className="text-[15px] font-black tracking-tight">Developer Profile Analytics</h1>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-card/40 border border-border/40 rounded-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary/20 via-indigo-500/20 to-purple-500/20" />
          
          <Avatar className="size-20 rounded-card border-4 border-background shadow-xl z-10">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-xl font-black">{username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 z-10">
            <h2 className="text-2xl font-black tracking-tight">{profile.name || username}</h2>
            <p className="text-sm text-muted-foreground font-medium">@{profile.login}</p>
            
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {profile.company && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                  <Building2 className="size-4 text-muted-foreground" />
                  {profile.company}
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                  <MapPin className="size-4 text-muted-foreground" />
                  {profile.location}
                </div>
              )}
              {profile.blog && (
                <a href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  <LinkIcon className="size-4" />
                  Website
                </a>
              )}
            </div>
            {profile.bio && <p className="mt-3 text-sm text-foreground/90 max-w-2xl">{profile.bio}</p>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 border border-border/40 bg-card rounded-card flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors">
            <div className="size-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
              <Users className="size-4 text-blue-500" />
            </div>
            <span className="text-xl font-black">{profile.followers}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Followers</span>
          </div>
          <div className="p-4 border border-border/40 bg-card rounded-card flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors">
            <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
              <UserPlus className="size-4 text-emerald-500" />
            </div>
            <span className="text-xl font-black">{profile.following}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Following</span>
          </div>
          <div className="p-4 border border-border/40 bg-card rounded-card flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors">
            <div className="size-8 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
              <BookOpen className="size-4 text-purple-500" />
            </div>
            <span className="text-xl font-black">{profile.public_repos}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Repositories</span>
          </div>
          <div className="p-4 border border-border/40 bg-card rounded-card flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors">
            <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
              <Star className="size-4 text-amber-500" />
            </div>
            <span className="text-xl font-black">{totalStars}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Stars</span>
          </div>
        </div>

        {/* GitHub Activity & Streaks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-6 border border-border/40 bg-card rounded-card flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 z-0" />
            <h3 className="text-lg font-bold mb-6 w-full text-left z-10 flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              Activity & Badges
            </h3>
            <div className="z-10 w-full flex justify-center min-h-[150px]">
              <img 
                src={`https://github-readme-stats-eight-theta.vercel.app/api?username=${username}&show_icons=true&hide_border=true&hide_bg=true&title_color=${isDark ? "ffffff" : "0f172a"}&text_color=${isDark ? "cbd5e1" : "475569"}&icon_color=${isDark ? "8b5cf6" : "6366f1"}`} 
                alt={`${username} GitHub Stats`} 
                onError={(e) => {
                  if (e.currentTarget.src.includes('eight-theta')) {
                    e.currentTarget.src = `https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true&hide_border=true&hide_bg=true&title_color=${isDark ? "ffffff" : "0f172a"}&text_color=${isDark ? "cbd5e1" : "475569"}&icon_color=${isDark ? "8b5cf6" : "6366f1"}`;
                  } else {
                    e.currentTarget.style.display = 'none';
                  }
                }}
                className="w-full max-w-[450px] object-contain transition-transform group-hover:scale-[1.02] duration-500 drop-shadow-sm" 
              />
            </div>
          </div>

          <div className="p-6 border border-border/40 bg-card rounded-card flex flex-col items-center justify-center relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-primary/5 z-0" />
            <h3 className="text-lg font-bold mb-6 w-full text-left z-10 flex items-center gap-2">
              <Star className="size-5 text-emerald-500" />
              Contribution Streaks
            </h3>
            <div className="z-10 w-full flex justify-center min-h-[150px]">
              <img 
                src={`https://github-readme-streak-stats.herokuapp.com/?user=${username}&hide_border=true&background=transparent&title_color=${isDark ? "ffffff" : "0f172a"}&text_color=${isDark ? "cbd5e1" : "475569"}&sideNums=${isDark ? "ffffff" : "0f172a"}&sideLabels=${isDark ? "94a3b8" : "64748b"}&ring=${isDark ? "10b981" : "059669"}&fire=${isDark ? "10b981" : "059669"}&currStreakNum=${isDark ? "ffffff" : "0f172a"}`} 
                alt={`${username} GitHub Streak`} 
                onError={(e) => e.currentTarget.style.display = 'none'}
                className="w-full max-w-[450px] object-contain transition-transform group-hover:scale-[1.02] duration-500 drop-shadow-sm" 
              />
            </div>
          </div>
        </div>

        {/* Main Charts & Analytics Dashboard */}
        <GithubAnalyticsDashboard repos={repos} />

      </div>
    </div>
  );
}
