import Image from "next/image";
import { ArrowRight, Code2, Download, Pill } from "lucide-react";

import styles from "./landing.module.css";

const apkUrl =
  "https://github.com/22duxiaoyu/yaokao-suji/releases/latest/download/yaokao-suji-demo.apk";

export default function LandingPage() {
  return (
    <main className={styles.site}>
      <nav className={styles.nav} aria-label="主导航">
        <a className={styles.brand} href="#top" aria-label="药考速记首页">
          <span className={styles.brandMark}><Pill size={17} strokeWidth={2.5} /></span>
          <span>药考速记</span>
        </a>
        <div className={styles.navLinks}>
          <a href="#materials">资料</a>
          <a href="#review">复习</a>
          <a href="#download">下载</a>
        </div>
        <a className={styles.navExperience} href="/app">
          在线体验
        </a>
      </nav>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.productName}>药考速记</p>
          <h1>把资料，<br className={styles.mobileBreak} />变成记忆。</h1>
          <p className={styles.heroLead}>AI 出卡、个人知识库与薄弱点复习，一条完整的学习链路。</p>
          <div className={styles.heroActions}>
            <a href="/app">在线体验 <ArrowRight size={19} /></a>
            <a href={apkUrl}>下载 Android <Download size={18} /></a>
          </div>
        </div>
        <div className={styles.heroProduct}>
          <Image
            className={styles.heroPhone}
            src="/product/review.png"
            width={804}
            height={1748}
            loading="eager"
            fetchPriority="high"
            alt="药考速记复习界面"
          />
        </div>
      </section>

      <section className={styles.manifesto}>
        <p>你的资料，不该读完就散。</p>
        <h2>让每一个考点，都进入下一次复习。</h2>
      </section>

      <section className={styles.materials} id="materials">
        <div className={styles.storyHeading}>
          <p>个人知识库</p>
          <h2>资料进来。<br />知识留下。</h2>
          <span>上传 PDF、Word 或文本，AI 自动拆解并保留原文依据。</span>
        </div>
        <div className={styles.materialVisual}>
          <Image
            className={styles.materialPhone}
            src="/product/materials.png"
            width={804}
            height={1748}
            alt="药考速记资料页面"
          />
        </div>
      </section>

      <section className={styles.reviewStory} id="review">
        <div className={styles.reviewVisual}>
          <Image
            className={styles.progressPhone}
            src="/product/progress.png"
            width={804}
            height={1748}
            alt="药考速记学习进度页面"
          />
        </div>
        <div className={styles.reviewCopy}>
          <p>自适应复习</p>
          <h2>复习，不再凭感觉。</h2>
          <span>根据记住、模糊和忘记的真实反馈，动态预测下一次复习时间。</span>
          <a href="/app">进入复习 <ArrowRight size={19} /></a>
        </div>
      </section>

      <section className={styles.principles}>
        <div className={styles.principleIntro}>
          <p>AI 应该做什么</p>
          <h2>少一点黑箱。<br />多一点确定。</h2>
        </div>
        <div className={styles.principleList}>
          <article>
            <span>01</span>
            <h3>提炼，而不是编造</h3>
            <p>每张卡保留原文位置，答案随时可以回查。</p>
          </article>
          <article>
            <span>02</span>
            <h3>推荐，而不是替代</h3>
            <p>AI 给出建议，用户确认、纠错并收藏真正的重点。</p>
          </article>
          <article>
            <span>03</span>
            <h3>适量，而不是堆积</h3>
            <p>根据薄弱程度控制复习量，不制造新的学习压力。</p>
          </article>
        </div>
      </section>

      <section className={styles.download} id="download">
        <div className={styles.downloadCopy}>
          <p>Android Demo</p>
          <h2>现在，装进手机。</h2>
          <span>真实安装包。无需应用商店，下载后即可体验。</span>
          <div className={styles.downloadActions}>
            <a className={styles.downloadButton} href={apkUrl}>
              <Download size={19} /> 下载 APK
            </a>
            <a className={styles.downloadLink} href="/app">
              先在线体验 <ArrowRight size={18} />
            </a>
          </div>
        </div>
        <Image
          className={styles.downloadPhone}
          src="/product/review.png"
          width={804}
          height={1748}
          alt="药考速记 Android 应用"
        />
      </section>

      <footer className={styles.footer}>
        <a className={styles.brand} href="#top">
          <span className={styles.brandMark}><Pill size={16} /></span>
          <span>药考速记</span>
        </a>
        <p>个人 AI 产品作品集 · 仅用于学习与面试展示</p>
        <a href="https://github.com/22duxiaoyu/yaokao-suji" target="_blank" rel="noreferrer">
          <Code2 size={17} /> GitHub
        </a>
      </footer>
    </main>
  );
}
