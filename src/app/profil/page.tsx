"use client";

import { FileText, FileUp, GitBranch, PartyPopper, PencilLine, Share2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AddProjectDialog } from "@/components/add-project-dialog";
import { CertificateDialog } from "@/components/certificate-dialog";
import { CvUploadDialog } from "@/components/cv-upload-dialog";
import { GithubVerify } from "@/components/github-verify";
import { Card, PageShell } from "@/components/page-shell";
import { ProfileEditDialog } from "@/components/profile-edit-dialog";
import { ProfileView } from "@/components/profile-view";
import { ReferenceDialog } from "@/components/reference-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { Progress } from "@/components/ui/progress";
import { btn } from "@/lib/btn";
import { completeness } from "@/lib/score";
import { useApp, useMyScore } from "@/lib/store";

function MyProfile() {
  const profile = useApp((s) => s.profile)!;
  const projects = useApp((s) => s.projects);
  const certs = useApp((s) => s.certs);
  const references = useApp((s) => s.references);
  const roadmap = useApp((s) => s.roadmap);
  const people = useApp((s) => s.people);
  const competitionHistory = useApp((s) => s.competitionHistory);
  const badges = useApp((s) => s.badges);
  const credentials = useApp((s) => s.credentials);
  const score = useMyScore();
  const params = useSearchParams();
  const router = useRouter();

  // ?duzenle=1, ?onay=1, ?sertifika=1 ile ilgili pencere açık başlar (yol haritası kısayolları).
  const [edit, setEdit] = useState(() => !!params.get("duzenle"));
  const [cert, setCert] = useState(() => !!params.get("sertifika"));
  const [ref, setRef] = useState<{ open: boolean; preset?: string }>(() => ({ open: !!params.get("onay") }));
  const [addProject, setAddProject] = useState(false);
  const [cv, setCv] = useState(() => !!params.get("cv"));
  const achievement = useApp((s) => s.achievement);
  const [share, setShare] = useState(() => !!params.get("paylas"));

  useEffect(() => {
    if (params.size) router.replace("/profil", { scroll: false });
  }, [params, router]);

  const comp = completeness(profile, projects);
  const nextStep = roadmap?.steps.find((s) => !score.roadmapDone.includes(s.id));

  return (
    <>
      <ProfileView
        own
        data={{
          ...profile,
          projects: projects.filter((p) => p.status === "hazır").map((p) => ({ id: p.id, name: p.name, techs: p.techs, description: p.description, difficulty: p.analysis.difficulty, quality: p.analysis.quality, points: p.analysis.points, repoUrl: p.repoUrl })),
          references,
          certs,
          competitions: competitionHistory,
          connections: profile.connections.map((u) => people[u] ?? { username: u, name: u, field: "" }),
          score: score.season,
          total: score.total,
          level: score.level,
          rank: score.rank,
          badges,
          credentials,
        }}
        actions={
          <>
            <button onClick={() => setEdit(true)} className={btn("primary")}>
              <PencilLine /> Profili düzenle
            </button>
            <button onClick={() => setCv(true)} className={btn("outline")}>
              <FileUp /> CV&apos;mi yükle
            </button>
            <Link href={`/u/${profile.username}/cv`} className={btn("outline")}>
              <FileText /> Doğrulanmış CV
            </Link>
          </>
        }
        onAddCert={() => setCert(true)}
        onRequestRef={(preset) => setRef({ open: true, preset })}
        onAddProject={() => setAddProject(true)}
        sidebarTop={
          <>
            {achievement && (
              <div className="rounded-3xl border border-primary/30 bg-secondary p-6 text-secondary-foreground">
                <p className="flex items-center gap-2 font-semibold">
                  <PartyPopper className="size-4" /> {achievement.headline}!
                </p>
                <p className="mt-1 text-sm">{achievement.sub}</p>
                <button onClick={() => setShare(true)} className={btn("primary", "sm", "mt-4")}>
                  <Share2 /> Instagram ve X&apos;te paylaş
                </button>
              </div>
            )}
            {!profile.githubVerified && (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 font-semibold">
                  <GitBranch className="size-4" /> GitHub doğrulaması
                </h2>
                {profile.github ? (
                  <GithubVerify />
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Proje eklemek ve yarışma puanı almak için GitHub hesabını ekleyip doğrula.</p>
                    <button onClick={() => setEdit(true)} className={btn("primary", "sm", "mt-3")}>
                      GitHub kullanıcı adını ekle
                    </button>
                  </>
                )}
              </Card>
            )}
            {comp.percent < 100 && (
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">Profil doluluğu</h2>
                  <span className="text-sm font-semibold text-primary">%{comp.percent}</span>
                </div>
                <Progress value={comp.percent} />
                <ul className="mt-4 grid gap-2 text-sm">
                  {comp.items
                    .filter((i) => !i.done)
                    .slice(0, 3)
                    .map((i) => (
                      <li key={i.label}>
                        {i.href.startsWith("/profil") ? (
                          <button onClick={() => setEdit(true)} className="text-muted-foreground hover:text-foreground">
                            + {i.label}
                          </button>
                        ) : (
                          <Link href={i.href} className="text-muted-foreground hover:text-foreground">
                            + {i.label}
                          </Link>
                        )}
                      </li>
                    ))}
                </ul>
              </Card>
            )}
            <Card>
              <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">Sıradaki adım</p>
              {nextStep ? (
                <>
                  <p className="mt-3 font-semibold">{nextStep.title}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">+{nextStep.points} puan</span>
                    <Link href={nextStep.action.href} className="text-sm font-semibold text-primary hover:underline">
                      {nextStep.action.label} →
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-3 font-semibold">{roadmap ? "Yol haritandaki tüm adımları bitirdin." : "Sana özel yol haritanı oluştur."}</p>
                  <Link href="/yol-haritasi" className={btn("lav", "sm", "mt-4")}>
                    <Sparkles /> Yol haritam
                  </Link>
                </>
              )}
            </Card>
          </>
        }
      />
      <ProfileEditDialog open={edit} onOpenChange={setEdit} />
      <CertificateDialog open={cert} onOpenChange={setCert} />
      <ReferenceDialog open={ref.open} preset={ref.preset} onOpenChange={(o) => setRef({ open: o })} />
      <AddProjectDialog open={addProject} onOpenChange={setAddProject} />
      <CvUploadDialog open={cv} onOpenChange={setCv} />
      {achievement && <ShareDialog open={share} onOpenChange={setShare} username={profile.username} headline={achievement.headline} />}
    </>
  );
}

export default function Page() {
  return (
    <PageShell auth>
      <Suspense>
        <MyProfile />
      </Suspense>
    </PageShell>
  );
}
