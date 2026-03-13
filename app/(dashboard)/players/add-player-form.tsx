"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addTrackedPlayer } from "@/app/actions/players";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const REGIONS = [
  "na1",
  "euw1",
  "eun1",
  "kr",
  "br1",
  "jp1",
  "la1",
  "la2",
  "oc1",
  "ru",
  "tr1",
  "ph2",
  "sg2",
  "th2",
  "tw2",
  "vn2",
];

export function AddPlayerForm() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState("euw1");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await addTrackedPlayer(gameName, tagLine, region);
    setPending(false);
    if (result.ok) {
      toast.success(result.message);
      setGameName("");
      setTagLine("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="gameName">Game name</Label>
        <Input
          id="gameName"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          placeholder="Summoner"
          required
          className="w-36"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tagLine">Tag line</Label>
        <Input
          id="tagLine"
          value={tagLine}
          onChange={(e) => setTagLine(e.target.value)}
          placeholder="NA1"
          required
          className="w-24"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Region</Label>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add player"}
      </Button>
    </form>
  );
}
