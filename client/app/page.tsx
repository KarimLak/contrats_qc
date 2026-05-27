"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<"platform" | "consulting">("platform");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --teal: #00B3A9; --teal-d: #009991; --teal-l: #E6F7F6; --teal-mid: #B3E6E3;
          --navy: #1B2A4A; --white: #FFFFFF; --cream: #F7FAFA;
          --border: #DCE8E8; --text: #1B2A4A; --text2: #4A6A6A; --text3: #8BA5A5;
          --sans: 'Outfit', system-ui, sans-serif; --r: 12px; --rl: 20px;
        }
        html { scroll-behavior: smooth; }
        body { font-family: var(--sans); background: var(--white); color: var(--text); -webkit-font-smoothing: antialiased; }

        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 56px; height: 68px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.97); transition: box-shadow 0.25s; }
        .nav.scrolled { box-shadow: 0 1px 0 var(--border), 0 4px 24px rgba(0,179,169,0.07); }
        .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.4px; color: var(--navy); text-decoration: none; display: flex; align-items: center; gap: 9px; }
        .mark { width: 32px; height: 32px; border-radius: 9px; background: var(--teal); display: flex; align-items: center; justify-content: center; color: white; font-size: 15px; font-weight: 800; flex-shrink: 0; }
        .nav-links { display: flex; align-items: center; gap: 36px; list-style: none; }
        .nav-links a { font-size: 14px; font-weight: 500; color: var(--text2); text-decoration: none; transition: color 0.15s; }
        .nav-links a:hover { color: var(--teal); }
        .nav-end { display: flex; align-items: center; gap: 10px; }
        .btn-o { padding: 9px 20px; background: transparent; border: 1.5px solid var(--border); border-radius: var(--r); color: var(--navy); font-size: 14px; font-weight: 500; font-family: var(--sans); cursor: pointer; text-decoration: none; transition: border-color .15s, color .15s; }
        .btn-o:hover { border-color: var(--teal); color: var(--teal); }
        .btn-t { padding: 9px 20px; background: var(--teal); border: none; border-radius: var(--r); color: white; font-size: 14px; font-weight: 600; font-family: var(--sans); cursor: pointer; text-decoration: none; transition: background .15s; }
        .btn-t:hover { background: var(--teal-d); }

        .hero { min-height: 100vh; padding: 140px 56px 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; background: var(--white); text-align: center; }
        .blob { position: absolute; border-radius: 50%; pointer-events: none; }
        .b1 { width: 800px; height: 800px; top: -250px; right: -250px; background: radial-gradient(circle, rgba(0,179,169,0.11) 0%, transparent 65%); }
        .b2 { width: 600px; height: 600px; bottom: -150px; left: -200px; background: radial-gradient(circle, rgba(0,179,169,0.08) 0%, transparent 65%); }
        .dots { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(circle, rgba(0,179,169,0.18) 1px, transparent 1px); background-size: 30px 30px; opacity: 0.5; mask-image: radial-gradient(ellipse 75% 75% at 50% 50%, black 30%, transparent 100%); }
        .hi { position: relative; z-index: 1; max-width: 800px; }
        .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; background: var(--teal-l); border: 1px solid var(--teal-mid); border-radius: 100px; font-size: 12px; font-weight: 700; color: var(--teal-d); letter-spacing: 0.4px; margin-bottom: 28px; text-transform: uppercase; }
        .bdot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); animation: blink 2s ease infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .hero h1 { font-size: clamp(40px, 6vw, 70px); font-weight: 800; line-height: 1.08; letter-spacing: -2px; color: var(--navy); margin-bottom: 22px; }
        .tc { color: var(--teal); }
        .hsub { font-size: 18px; line-height: 1.75; color: var(--text2); max-width: 540px; margin: 0 auto 44px; }
        .hbtns { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
        .bh { padding: 16px 36px; background: var(--teal); border: none; border-radius: var(--r); color: white; font-size: 16px; font-weight: 700; font-family: var(--sans); cursor: pointer; text-decoration: none; box-shadow: 0 4px 16px rgba(0,179,169,0.35); transition: background .15s, transform .15s, box-shadow .15s; }
        .bh:hover { background: var(--teal-d); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,179,169,0.4); }
        .bho { padding: 16px 36px; background: transparent; border: 1.5px solid var(--border); border-radius: var(--r); color: var(--navy); font-size: 16px; font-weight: 500; font-family: var(--sans); cursor: pointer; text-decoration: none; transition: border-color .15s, color .15s; }
        .bho:hover { border-color: var(--teal); color: var(--teal); }
        .trust { margin-top: 60px; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; color: var(--text3); }
        .avs { display: flex; }
        .av { width: 30px; height: 30px; border-radius: 50%; border: 2.5px solid white; margin-left: -9px; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; color: white; }
        .av:first-child { margin-left: 0; }

        .stats { background: var(--navy); padding: 44px 56px; display: flex; align-items: stretch; justify-content: center; flex-wrap: wrap; }
        .stat { flex: 1; min-width: 160px; text-align: center; padding: 16px 40px; position: relative; }
        .stat+.stat::before { content:""; position:absolute; left:0; top:15%; bottom:15%; width:1px; background:rgba(255,255,255,0.1); }
        .sn { font-size: 42px; font-weight: 800; color: white; line-height: 1; margin-bottom: 8px; letter-spacing: -1.5px; }
        .sn span { color: var(--teal); }
        .sl { font-size: 13px; color: rgba(255,255,255,0.45); }

        .sec { padding: 96px 56px; }
        .sc { background: var(--cream); }
        .sw { background: var(--white); }
        .sin { max-width: 1100px; margin: 0 auto; }
        .stag { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--teal); margin-bottom: 12px; display: block; }
        .sh2 { font-size: clamp(26px, 3.5vw, 42px); font-weight: 800; line-height: 1.15; letter-spacing: -0.5px; color: var(--navy); margin-bottom: 14px; }
        .sp { font-size: 16px; line-height: 1.7; color: var(--text2); }

        .itop { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; margin-bottom: 64px; }
        .iq { font-size: clamp(28px, 3.5vw, 44px); font-weight: 800; line-height: 1.2; letter-spacing: -0.5px; color: var(--navy); }
        .iq span { color: var(--teal); }
        .isrc { font-size: 12px; color: var(--text3); font-weight: 500; margin-top: 16px; display: block; }
        .ig { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .is { background: var(--white); border: 1.5px solid var(--border); border-radius: var(--rl); padding: 32px 28px; transition: border-color .2s, box-shadow .2s; }
        .is:hover { border-color: var(--teal-mid); box-shadow: 0 4px 20px rgba(0,179,169,0.08); }
        .isn { font-size: 38px; font-weight: 800; color: var(--teal); letter-spacing: -1px; margin-bottom: 8px; }
        .isl { font-size: 15px; font-weight: 700; color: var(--navy); margin-bottom: 6px; }
        .isd { font-size: 13px; color: var(--text2); line-height: 1.6; }

        .lvhd { text-align: center; margin-bottom: 48px; }
        .tabs { display: flex; align-items: center; justify-content: center; background: var(--cream); border: 1.5px solid var(--border); border-radius: 14px; padding: 5px; width: fit-content; margin: 0 auto 48px; }
        .tab { padding: 11px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; border: none; font-family: var(--sans); transition: background .2s, color .2s, box-shadow .2s; background: transparent; color: var(--text2); }
        .tab.on { background: var(--white); color: var(--navy); box-shadow: 0 2px 8px rgba(27,42,74,0.1); }
        .lg { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .lc { border: 1.5px solid var(--border); border-radius: var(--rl); overflow: hidden; }
        .lch { padding: 32px 36px; background: var(--navy); }
        .lch.tl { background: var(--teal); }
        .lch h3 { font-size: 22px; font-weight: 800; color: white; margin-bottom: 8px; }
        .lch p { font-size: 14px; color: rgba(255,255,255,0.55); line-height: 1.6; }
        .lcb { padding: 32px 36px; background: var(--white); }
        .li { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
        .lck { width: 20px; height: 20px; border-radius: 6px; background: var(--teal-l); border: 1px solid var(--teal-mid); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; font-size: 11px; color: var(--teal-d); font-weight: 800; }
        .lit { font-size: 14px; color: var(--text2); line-height: 1.6; }
        .lit strong { color: var(--navy); font-weight: 600; }
        .lcta { margin-top: 28px; padding-top: 24px; border-top: 1.5px solid var(--border); }
        .blv { display: inline-block; padding: 12px 24px; background: var(--teal); color: white; text-decoration: none; border-radius: var(--r); font-size: 14px; font-weight: 700; font-family: var(--sans); transition: background .15s; }
        .blv:hover { background: var(--teal-d); }
        .blvo { display: inline-block; padding: 12px 24px; background: transparent; color: var(--navy); text-decoration: none; border-radius: var(--r); font-size: 14px; font-weight: 600; font-family: var(--sans); border: 1.5px solid var(--border); transition: border-color .15s, color .15s; }
        .blvo:hover { border-color: var(--teal); color: var(--teal); }

        .fg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 56px; }
        .fc { background: var(--white); border: 1.5px solid var(--border); border-radius: var(--rl); padding: 36px 30px; transition: border-color .2s, box-shadow .2s, transform .2s; }
        .fc:hover { border-color: var(--teal-mid); transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,179,169,0.1); }
        .fi { width: 48px; height: 48px; border-radius: 13px; background: var(--teal-l); display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 20px; }
        .fc h3 { font-size: 17px; font-weight: 700; margin-bottom: 10px; color: var(--navy); }
        .fc p { font-size: 14px; line-height: 1.7; color: var(--text2); }

        .steps { margin-top: 56px; }
        .step { display: flex; gap: 36px; align-items: flex-start; padding: 36px 0; border-bottom: 1.5px solid var(--border); }
        .step:last-child { border-bottom: none; }
        .snum { width: 44px; height: 44px; border-radius: 12px; background: var(--teal); color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; flex-shrink: 0; margin-top: 2px; }
        .step h3 { font-size: 19px; font-weight: 700; margin-bottom: 8px; color: var(--navy); }
        .step p { font-size: 15px; line-height: 1.7; color: var(--text2); }

        .cta { background: var(--teal); padding: 100px 56px; text-align: center; position: relative; overflow: hidden; }
        .cb1 { position: absolute; width: 600px; height: 600px; border-radius: 50%; background: rgba(255,255,255,0.07); top: -200px; right: -150px; pointer-events: none; }
        .cb2 { position: absolute; width: 400px; height: 400px; border-radius: 50%; background: rgba(255,255,255,0.05); bottom: -150px; left: -100px; pointer-events: none; }
        .ctai { position: relative; z-index: 1; max-width: 600px; margin: 0 auto; }
        .ctai h2 { font-size: clamp(28px, 4vw, 46px); font-weight: 800; line-height: 1.15; color: white; margin-bottom: 16px; letter-spacing: -0.5px; }
        .ctai p { font-size: 16px; color: rgba(255,255,255,0.8); margin-bottom: 40px; line-height: 1.7; }
        .ctabtns { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
        .bw { padding: 15px 32px; background: white; border: none; border-radius: var(--r); color: var(--teal); font-size: 16px; font-weight: 700; font-family: var(--sans); cursor: pointer; text-decoration: none; box-shadow: 0 4px 16px rgba(0,0,0,0.15); transition: transform .15s, box-shadow .15s; }
        .bw:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .bow { padding: 15px 32px; background: transparent; border: 1.5px solid rgba(255,255,255,0.45); border-radius: var(--r); color: white; font-size: 16px; font-weight: 500; font-family: var(--sans); cursor: pointer; text-decoration: none; transition: border-color .15s, background .15s; }
        .bow:hover { border-color: white; background: rgba(255,255,255,0.1); }

        .foot { background: var(--navy); padding: 40px 56px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; border-top: 1px solid rgba(255,255,255,0.06); }
        .fl { display: flex; align-items: center; gap: 12px; }
        .fb { font-size: 14px; font-weight: 700; color: white; }
        .fcp { font-size: 13px; color: rgba(255,255,255,0.3); }
        .flinks { display: flex; gap: 24px; }
        .flinks a { font-size: 13px; color: rgba(255,255,255,0.4); text-decoration: none; transition: color .15s; }
        .flinks a:hover { color: var(--teal); }

        @media (max-width: 900px) {
          .nav { padding: 0 20px; }
          .nav-links { display: none; }
          .hero { padding: 120px 20px 64px; }
          .sec { padding: 64px 20px; }
          .stats { padding: 28px 20px; }
          .stat { padding: 12px 20px; }
          .itop { grid-template-columns: 1fr; gap: 32px; }
          .ig, .lg, .fg { grid-template-columns: 1fr; }
          .step { flex-direction: column; gap: 14px; }
          .cta { padding: 64px 20px; }
          .foot { padding: 28px 20px; flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* NAV */}
      <PublicNav />

      {/* HERO */}
      <section className="hero">
        <div className="blob b1" /><div className="blob b2" /><div className="dots" />
        <div className="hi">
          <h1>Trouvez les contrats<br />gouvernementaux <span className="tc">faits pour vous</span></h1>
          <p className="hsub">Accédez à plus de 2 000 appels d'offres du SEAO en temps réel. Filtrez, analysez et identifiez les opportunités adaptées à votre secteur et région.</p>
          <div className="hbtns">
            <Link href="/register" className="bh">Explorer les contrats →</Link>
            <Link href="/register" className="bho">Créer un compte gratuit</Link>
          </div>
          <div className="trust">
            <div className="avs">
              {[["#00B3A9","M"],["#1B2A4A","J"],["#F59E0B","S"],["#6366F1","A"]].map(([c,l])=>(
                <div key={l} className="av" style={{background:c}}>{l}</div>
              ))}
            </div>
            <span>Rejoignez des dizaines d'entreprises québécoises</span>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats">
        {[["2 000","+","Contrats actifs"],["17","","Régions couvertes"],["9","","Types d'avis"],["24","h","Mise à jour"]].map(([n,s,l])=>(
          <div className="stat" key={l}><div className="sn">{n}<span>{s}</span></div><div className="sl">{l}</div></div>
        ))}
      </div>

      {/* INSIGHT */}
      <section className="sec sc">
        <div className="sin">
          <div className="itop">
            <div>
              <span className="stag">Le problème</span>
              <div className="iq">Seulement <span>1% des PME</span> québécoises soumissionnent sur des contrats gouvernementaux</div>
              <span className="isrc">Source : Innovation, Sciences et Développement économique Canada, 2024</span>
            </div>
            <div>
              <p style={{fontSize:16,lineHeight:1.8,color:"var(--text2)",marginBottom:16}}>Par manque de temps, de visibilité et d'outils adaptés, des milliers d'entreprises passent chaque année à côté d'opportunités considérables avec les organismes publics québécois.</p>
              <p style={{fontSize:16,lineHeight:1.8,color:"var(--text2)"}}>Le SEAO publie des dizaines d'appels d'offres chaque semaine. Mais les trouver, les comprendre et y répondre efficacement reste un défi pour la plupart des entreprises.</p>
            </div>
          </div>
          <div className="ig">
            {[
              {n:"+2 000",l:"Contrats actifs sur le SEAO",d:"Mis à jour quotidiennement depuis toutes les régions du Québec"},
              {n:"9 types",l:"D'appels d'offres différents",d:"Construction, services professionnels, approvisionnement, intentions et plus"},
              {n:"Gratuit",l:"Pour commencer à explorer",d:"Accès complet à l'explorateur sans frais. Fonctionnalités avancées en Pro."},
            ].map(s=>(
              <div className="is" key={s.l}><div className="isn">{s.n}</div><div className="isl">{s.l}</div><div className="isd">{s.d}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="sec sc">
        <div className="sin">
          <span className="stag">Fonctionnalités</span>
          <h2 className="sh2">Tout ce dont vous avez besoin</h2>
          <p className="sp">Une interface moderne construite sur les données ouvertes du SEAO, avec les outils que les entreprises québécoises méritent.</p>
          <div className="fg">
            {[{i:"v",t:"Recherche avancée",d:"Filtrez par région, catégorie, type, organisation ou date de fermeture. Résultats instantanés."},{i:"📋",t:"Données complètes",d:"Description, documents, contacts, accords applicables et classifications pour chaque avis."},{i:"⚡",t:"Mis à jour en continu",d:"Les nouveaux avis du SEAO sont indexés quotidiennement. Aucune opportunité manquée."},{i:"🎯",t:"Pertinence personnalisée",d:"Définissez votre profil et voyez les contrats les plus pertinents pour vous en premier."},{i:"📊",t:"Vue d'ensemble",d:"Tendances, organisations actives, secteurs porteurs dans votre région cible."},{i:"🔒",t:"Accès sécurisé",d:"Authentification robuste, sessions sécurisées et protection de vos données."}].map(f=>(
              <div className="fc" key={f.t}><div className="fi">{f.i}</div><h3>{f.t}</h3><p>{f.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sec sw">
        <div className="sin">
          <span className="stag">Comment ça marche</span>
          <h2 className="sh2">Simple, rapide, efficace</h2>
          <p className="sp">Trois étapes pour commencer à trouver et saisir les meilleures opportunités gouvernementales.</p>
          <div className="steps">
            {[["Créez votre compte","Inscrivez-vous gratuitement en moins d'une minute. Renseignez votre secteur et vos régions cibles."],["Explorez les appels d'offres","Accédez à la liste complète des contrats actifs. Filtrez selon votre spécialité — construction, services informatiques, approvisionnement, et plus."],["Analysez et soumissionnez","Consultez tous les détails d'un avis — description, documents, contacts — et accédez directement au SEAO pour soumettre votre offre."]].map(([t,d],i)=>(
              <div className="step" key={t}><div className="snum">{i+1}</div><div><h3>{t}</h3><p>{d}</p></div></div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cb1" /><div className="cb2" />
        <div className="ctai">
          <h2>Prêt à trouver votre prochain contrat ?</h2>
          <p>Rejoignez les entreprises québécoises qui utilisent contrats_qc pour identifier et saisir les meilleures opportunités gouvernementales.</p>
          <div className="ctabtns">
            <Link href="/register" className="bw">Commencer gratuitement</Link>
            <Link href="/pricing" className="bow">Voir les tarifs</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot">
        <div className="fl">
          <div className="mark" style={{width:26,height:26,fontSize:12}}>C</div>
          <span className="fb">contrats_qc</span>
          <span className="fcp">© 2026 — Données SEAO du Québec</span>
        </div>
        <div className="flinks">
          <Link href="/about">À propos</Link>
          <Link href="/pricing">Tarifs</Link>
          <Link href="/login">Connexion</Link>
          <Link href="/register">Inscription</Link>
        </div>
      </footer>
    </>
  );
}
