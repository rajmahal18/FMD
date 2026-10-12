// Transcribed from organizer-supplied Operation: Classified Team 1–5 posters.
// Review spelling and office codes before issuing credentials.
export type AgentSeed = {name:string; office:string; sex:"F"|"M"};
function parse(s:string):AgentSeed[]{return s.trim().split('\n').map(line=>{const [name,office,sex]=line.split('|').map(x=>x.trim());if(!name||!office||(sex!=="F"&&sex!=="M"))throw Error(`Invalid roster row: ${line}`);return {name,office,sex};});}
export const operationRoster = [
 {team:"Team 1",color:"#D5B369",members:parse(`Aspi, Siara-Faye|S2DEO - CFMS|F
Basion, Roselani|TTDEO - CFMS|F
Cosain, Sahara|LDS1DEO - CFMS|F
Decampong, Johanisa|LDS2DEO - CFMS|F
Gecosala, Marichu|FMD - BS|F
Guiamadil, Abdulkahar|MDSDEO - CFMS|M
Hadis, Marilyn|S2DEO - CFMS|F
Hadji Sakur, Anjiada|S1DEO - CFMS|F
Hussin, Sheila Mayl|BDEO - CFMS|F
Kadir, Saima|CCDEO - CFMS|F
Legita, Mariel Yvonne|CCDEO - CFMS|F
Madid, Madeenah|FMD - AS|F
Martinez, Kaila|FMD - AS|F
Masukat, Abujahirin|MDNDEO - CFMS|M
Musor, Faisalh|LDS1DEO - CFMS|F
Pascual, Noah Jul|FMD - AS|M
Salih, Junaidin|FMD - CS|M
Samelon, Norhamin|MDNDEO - CFMS|M
Zarrah, Maharifa|FMD - BS|F`)},
 {team:"Team 2",color:"#B8BE8B",members:parse(`Akmad, Norjata|MDNDEO - CFMS|F
Balindong, Namraida|LDS2DEO - CFMS|F
Basirul, Adzramin|S1DEO - CFMS|M
Bitol, Mahather|FMD - BS|M
Buisan, Reena Essa|MDNDEO - CFMS|F
Deticio, Mylene|TTDEO - CFMS|F
Diansuy, Mary Jane|MDSDEO - CFMS|F
Esmael, Haroun|CCDEO - CFMS|M
Fontilla, Che Che|MDSDEO - CFMS|F
Ibrahim, Namraidah|LDS2DEO - CFMS|F
Japal, Faisal|FMD - AS|M
Lumanas, James Mark|BDEO - CFMS|M
Miparanum, Vin Lorenz|FMD - AS|F
Palahuddin, Sheilamar|S2DEO - CFMS|F
Pandao, Ibtisam|LDS2DEO - CFMS|F
Quitiol, Rain Cyrene|FMD - AS|F
Salilama, Faizee Hadith|FMD - CS|F
Sarip, Tondogun|LDS1DEO - CFMS|F
Solaiman, Ada Rizza|FMD - BS|F`)},
 {team:"Team 3",color:"#A9BCC7",members:parse(`Anilong, Merjia|S2DEO - CFMS|F
Aspi, Nashra|S2DEO - CFMS|F
Balang, Ma-arouph|FMD - AS|M
Cabaro, Maisarah|FMD - BS|F
Dela Peña, Jacob Amir|FMD - ODC|M
Espuerza, Brayn|CCDEO - CFMS|M
Gapor, Garshema|S1DEO - CFMS|F
Glang, Hasser|FMD - CS|M
Guiamalon, Seannelyn|FMD - BS|F
Ibrahim, Sarip Nur-Eisha|MDNDEO - CFMS|F
Jaalain, Alkhedaar|S2DEO - CFMS|M
Jaljalis, Al My Rhadz|BDEO - CFMS|F
Mona, Nobaida|LDS2DEO - CFMS|F
Nongka, Naaziyajane|FMD - AS|F
Ramada, Vicenta|FMD - CS|F
Rasuman, Bae Malieha|LDS1DEO - CFMS|F
Romo, Nerissa|MDSDEO - CFMS|F
Usman, Hanina|FMD - AS|F`)},
 {team:"Team 4",color:"#C2A0A1",members:parse(`Abdulkadir, Naim|MDSDEO - CFMS|M
Abdullah, Bai Sorayna|CCDEO - CFMS|F
Ahadain, Nurhaida|S2DEO - CFMS|F
Awaluddin, Rhoselda|S1DEO - CFMS|F
Bandah, Mondale|S2DEO - CFMS|M
Camsa, Rasmiya|FMD - CS|F
Dalocanog, Aiyen|TTDEO - CFMS|F
Fernando, Philip III|BDEO - CFMS|M
Gayak, Omar Hussein|FMD - AS|M
Kiram, Dayang Dayang Sheramar|S1DEO - CFMS|F
Macapeges, Zalika|FMD - BS|F
Malawani, Amina|LDS1DEO - CFMS|F
Musor-Galman, Sittie Saimah|MDNDEO - CFMS|F
Pumbayabaya, Najmah|LDS2DEO - CFMS|F
Salik, Faharudin|FMD - AS|M
Songalia, Mer Cris|FMD - AS|F
Sulvan, Bai Malejah|FMD - AS|F
Torres, Jemima Erin|BDEO - CFMS|F`)},
 {team:"Team 5",color:"#A9A4CE",members:parse(`Ali, Rohanie|LDS1DEO - CFMS|F
Alian, Kirma|S1DEO - CFMS|F
Alibsar, Jehad|MDSDEO - CFMS|M
Antolin, Mary Claire|FMD - AS|F
Aspi, Fatima Chereedan|S2DEO - CFMS|F
Bakang, Abdul Maguid|FMD - ODC|M
Balindong, Sittie Hajar|LDS2DEO - CFMS|F
Buisan, Noorfahad|MDNDEO - CFMS|M
Cabangon, Cyril Gerald|FMD - BS|M
Falcatan, Erica Jean|BDEO - CFMS|F
Jakkarain, Nilda|S2DEO - CFMS|F
Lee, Nur Elsa|S1DEO - CFMS|F
Macapeges, Sohayla|CCDEO - CFMS|F
Marabur, Omaira|LDS2DEO - CFMS|F
Namal, Ma. Sheryl|MDSDEO - CFMS|F
Pamlian, Norhaya|FMD - AS|F
Pendulat, Shamraida Jann|FMD - BS|F
Saylon, Norhaina|FMD - AS|F
Taha, Rohaidah|FMD - CS|F`)}
] as const;
