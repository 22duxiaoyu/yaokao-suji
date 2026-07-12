import {
  ArrowRight,
  BrainCircuit,
  Check,
  Code2,
  Download,
  FileSearch,
  Layers3,
  Pill,
  Play,
  Quote,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import styles from "./landing.module.css";

const apkUrl =
  "https://github.com/22duxiaoyu/yaokao-suji/releases/latest/download/yaokao-suji-demo.apk";

const workflow = [
  {
    icon: FileSearch,
    index: "01",
    title: "导入自己的资料",
    copy: "支持 PDF、Word 和文本，保留原文位置与资料来源。"
  },
  {
    icon: Sparkles,
    index: "02",
    title: "AI 提炼成卡",
    copy: "把长资料拆成可确认、可纠错、可追溯的药考知识卡。"
  },
  {
    icon: BrainCircuit,
    index: "03",
    title: "按薄弱点复习",
    copy: "根据记住、模糊和忘记的反馈，动态安排下一轮复习。"
  }
];

const features = [
  {
    icon: Layers3,
    title: "知识沉淀",
    copy: "资料、卡片和知识节点持续关联，逐步形成个人药考知识库。"
  },
  {
    icon: Quote,
    title: "答案可追溯",
    copy: "每张卡保留原文依据，遇到疑问可以回到资料重新核对。"
  },
  {
    icon: ShieldCheck,
    title: "人机共同确认",
    copy: "AI 负责提炼，用户负责确认；标记不准确，收藏真正的重点。"
  }
];

export default function LandingPage() {
  return (
    <main className={styles.site}>
      <nav className={styles.nav} aria-label="主导航">
        <a className={styles.brand} href="#top" aria-label="药考速记首页">
          <span className={styles.brandMark}><Pill size={19} strokeWidth={2.4} /></span>
          <span>药考速记</span>
        </a>
        <div className={styles.navLinks}>
          <a href="#workflow">工作方式</a>
          <a href="#features">核心能力</a>
          <a href="#download">下载</a>
        </div>
        <a className={styles.navAction} href="/app">
          在线体验 <ArrowRight size={16} />
        </a>
      </nav>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>AI 驱动的执业药师备考工具</p>
          <h1>药考速记</h1>
          <p className={styles.heroLead}>
            把散落在资料里的考点，变成真正记得住的个人知识卡。
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="/app">
              <Play size={18} fill="currentColor" /> 在线体验
            </a>
            <a className={styles.secondaryButton} href={apkUrl}>
              <Download size={18} /> 下载 Android
            </a>
          </div>
        </div>

        <a className={styles.productStage} href="/app" aria-label="进入药考速记在线体验">
          <div className={styles.stageCaption}>
            <span>今日复习</span>
            <strong>薄弱优先，恰到好处</strong>
          </div>
          <div className={styles.device}>
            <div className={styles.deviceSpeaker} />
            <iframe
              src="/app"
              title="药考速记产品预览"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
          <span className={styles.stageLink}>进入完整体验 <ArrowRight size={18} /></span>
        </a>
      </section>

      <section className={styles.statement} aria-label="产品理念">
        <p>不是再读一遍。</p>
        <h2>而是把每份资料，变成下一次该复习的内容。</h2>
      </section>

      <section className={styles.workflowSection} id="workflow">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>从资料到记忆</p>
          <h2>三步完成学习闭环</h2>
          <p>减少整理，把时间留给真正的理解和记忆。</p>
        </div>
        <div className={styles.workflowGrid}>
          {workflow.map((item) => {
            const Icon = item.icon;
            return (
              <article className={styles.workflowItem} key={item.index}>
                <div className={styles.workflowTopline}>
                  <span>{item.index}</span>
                  <Icon size={25} strokeWidth={1.8} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.proofSection} id="features">
        <div className={styles.proofVisual} aria-label="卡片生成示意">
          <div className={styles.sourceDocument}>
            <span>药理学讲义 · 第 38 页</span>
            <p>硝酸甘油急性发作时舌下含服，注意避光保存……</p>
          </div>
          <ArrowRight className={styles.proofArrow} size={24} />
          <div className={styles.flashcard}>
            <span>AI 生成 · 待确认</span>
            <h3>硝酸甘油的核心用药交代是什么？</h3>
            <div><Check size={16} /> 原文依据已关联</div>
          </div>
        </div>
        <div className={styles.proofCopy}>
          <p className={styles.eyebrow}>可信 AI 出卡</p>
          <h2>每个答案，都知道从哪里来。</h2>
          <p>
            卡片不是脱离资料的 AI 猜测。药考速记保留页码、原文和知识归属，让用户能够确认、修改与追溯。
          </p>
          <a href="/app">看看卡片如何生成 <ArrowRight size={17} /></a>
        </div>
      </section>

      <section className={styles.featureSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>围绕学习，而不是炫技</p>
          <h2>AI 做整理，人做判断。</h2>
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className={styles.featureItem} key={feature.title}>
                <Icon size={25} strokeWidth={1.8} />
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.downloadSection} id="download">
        <div>
          <p className={styles.eyebrow}>Android Demo</p>
          <h2>现在，装进手机。</h2>
          <p>下载安装包，直接体验资料出卡、知识沉淀与复习流程。</p>
        </div>
        <div className={styles.downloadActions}>
          <a className={styles.lightButton} href={apkUrl}>
            <Download size={19} /> 下载 APK
          </a>
          <a className={styles.textButton} href="/app">
            先在线体验 <ArrowRight size={17} />
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <a className={styles.brand} href="#top">
          <span className={styles.brandMark}><Pill size={18} /></span>
          <span>药考速记</span>
        </a>
        <p>个人 AI 产品作品集 · 仅用于学习与面试展示</p>
        <a href="https://github.com/22duxiaoyu/yaokao-suji" target="_blank" rel="noreferrer">
          <Code2 size={18} /> GitHub
        </a>
      </footer>
    </main>
  );
}
