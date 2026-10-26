import "dotenv/config";
import {mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import {PrismaClient} from "../src/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import {playerAccessPath} from "../src/lib/player-access";

const database = new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DATABASE_URL!})});
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
async function main() {
  const event = await database.event.findUniqueOrThrow({where: {slug: process.argv[2] || "operation-classified-fmd"}, select: {id:true, name:true}});
  const members = await database.eventMembership.findMany({where: {eventId:event.id, active:true, role:{in:["PARTICIPANT","FACILITATOR"]}, user:{active:true}}, select:{role:true, team:{select:{name:true}}, user:{select:{id:true,name:true}}}, orderBy:[{role:"asc"},{user:{name:"asc"}}]});
  if (!members.length) throw Error("No active participants or facilitators found; export cancelled.");
  const output = path.resolve(".tmp/account-qrs");
  await mkdir(output, {recursive:true});
  const manifest = [];
  const labels = [];
  for (const member of members) {
    const url = `https://fmd-two.vercel.app${playerAccessPath(member.user.id)}`;
    const group = member.role === "FACILITATOR" ? "Facilitators" : member.team?.name || "Unassigned";
    const folder = group.replace(/[^A-Za-z0-9_-]/g,"_");
    const file = `${member.user.name.replace(/[^A-Za-z0-9_-]/g,"_")}-${member.user.id}`;
    await mkdir(path.join(output,folder),{recursive:true});
    await QRCode.toFile(path.join(output,folder,`${file}.png`),url,{width:900,margin:4,errorCorrectionLevel:"M"});
    await writeFile(path.join(output,folder,`${file}.svg`),await QRCode.toString(url,{type:"svg",margin:4,errorCorrectionLevel:"M"}));
    const relative = `${folder}/${file}.png`;
    manifest.push({name:member.user.name,role:member.role,team:member.team?.name ?? "",url,png:relative});
    labels.push(`<article><img src="${escape(relative)}" alt="Account QR"><strong>${escape(member.user.name)}</strong><span>${escape(group)}</span></article>`);
  }
  await writeFile(path.join(output,"manifest.json"),JSON.stringify(manifest,null,2));
  await writeFile(path.join(output,"print.html"),`<!doctype html><html lang="en"><meta charset="utf-8"><title>Account QR labels</title><style>@page{size:A4;margin:12mm}body{font:14px Arial;margin:0;color:#10243a}header{padding:12px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}article{break-inside:avoid;text-align:center;padding:8mm 3mm;border:1px dashed #bbb;display:flex;flex-direction:column;align-items:center;overflow-wrap:anywhere}img{width:36mm;height:36mm}strong,span{max-width:100%}span{font-size:12px;margin-top:4px}@media screen and (max-width:500px){main{grid-template-columns:repeat(2,minmax(0,1fr))}}@media print{header{display:none}}</style><header>Account QR labels — ${escape(event.name)}. Print at 100% scale.</header><main>${labels.join("")}</main></html>`);
  await writeFile(path.join(output,"README.txt"),"Account access QR codes\nOpen print.html to print all labels at 100% scale, or use individual PNG/SVG files on participant IDs. Keep the white quiet zone.\nThese URLs identify accounts; a password is still required. No attendance or scoring is recorded.\nThe /players/[code] implementation must be deployed to https://fmd-two.vercel.app before scanning will work. Account IDs must be preserved when updating the roster.\n");
  console.log(JSON.stringify({output,total:members.length,participants:members.filter(m=>m.role==="PARTICIPANT").length,facilitators:members.filter(m=>m.role==="FACILITATOR").length}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>database.$disconnect());
