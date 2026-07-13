import Image from "next/image";
import {
  ArrowRight,
  Check,
  Code2,
  Download,
  FileUp,
  Layers3,
  Pill,
  Sparkles,
} from "lucide-react";

import styles from "./landing.module.css";

const apkUrl =
  "https://github.com/22duxiaoyu/yaokao-suji/releases/latest/download/yaokao-suji-demo.apk";

export default function LandingPage() {
  return (
    <main className={styles.site}>
      <nav className={styles.nav} aria-label="主导航">
        <div className={styles.navInner}>
          <a className={styles.brand} href="#top" aria-label="药考速记首页">
            <span className={styles.brandMark}>
              <Pill size={16} strokeWidth={2.5} />
            </span>
            <span>药考速记</span>
          </a>
          <div className={styles.navLinks}>
            <a href="#workflow">工作方式</a>
            <a href="#review">复习</a>
            <a href="#download">下载</a>
          </div>
          <a className={styles.navExperience} href="/app">
            在线体验
          </a>
        </div>
      </nav>

      <section className={styles.hero} id="top">
        <div className={styles.unitCopy}>
          <p className={styles.eyebrow}>AI 药考学习工具</p>
          <h1>药考速记</h1>
          <p className={styles.heroHeadline}>把资料，变成记忆。</p>
          <p className={styles.heroLead}>从个人资料出卡，到薄弱点复习，一条可信的学习链路。</p>
          <div className={styles.actions}>
            <a className={styles.primaryAction} href="/app">
              在线体验
            </a>
            <a className={styles.secondaryAction} href={apkUrl}>
              下载 Android <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <div className={styles.heroStage}>
          <Image
            className={styles.heroPhone}
            src="/product/review.png"
            width={804}
            height={1748}
            priority
            loading="eager"
            alt="药考速记复习界面"
          />
        </div>
      </section>

      <section className={styles.statement}>
        <p>你的资料，不该读完就散。</p>
        <h2>让每一个考点，都进入下一次复习。</h2>
      </section>

      <section className={styles.workflow} id="workflow" aria-label="产品工作方式">
        <div className={styles.workflowInner}>
          <div className={styles.workflowTitle}>
            <p className={styles.eyebrow}>一条完整链路</p>
            <h2>从文件，到真正记住。</h2>
          </div>
          <ol className={styles.steps}>
            <li>
              <FileUp aria-hidden="true" />
              <span>01</span>
              <strong>上传资料</strong>
              <p>PDF、Word 和文本都能成为你的知识来源。</p>
            </li>
            <li>
              <Sparkles aria-hidden="true" />
              <span>02</span>
              <strong>AI 提炼</strong>
              <p>知识点、卡片和原文依据一起沉淀。</p>
            </li>
            <li>
              <Layers3 aria-hidden="true" />
              <span>03</span>
              <strong>动态复习</strong>
              <p>薄弱优先，下一次出现由真实反馈决定。</p>
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.featureUnit} id="materials">
        <div className={styles.featureInner}>
          <div className={styles.featureCopy}>
            <p className={styles.eyebrow}>个人知识库</p>
            <h2>资料进来。<br />知识留下。</h2>
            <p className={styles.featureLead}>上传资料后，AI 自动拆解考点、保留来源，并持续沉淀为个人知识库。</p>
            <a className={styles.textLink} href="/app">
              查看资料体验 <ArrowRight size={18} />
            </a>
          </div>
          <div className={styles.featureStage}>
            <Image
              className={styles.featureImage}
              src="/product/materials-feature.png"
              width={804}
              height={980}
              alt="资料沉淀为卡片和知识架构"
            />
          </div>
        </div>
      </section>

      <section className={`${styles.featureUnit} ${styles.darkUnit}`} id="review">
        <div className={`${styles.featureInner} ${styles.reverseFeature}`}>
          <div className={styles.featureCopy}>
            <p className={styles.eyebrow}>自适应复习</p>
            <h2>复习，不再<br />凭感觉。</h2>
            <p className={styles.featureLead}>根据记住、模糊和忘记的真实反馈，动态安排下一次复习，让薄弱点先出现。</p>
            <a className={styles.textLink} href="/app">
              进入复习 <ArrowRight size={18} />
            </a>
          </div>
          <div className={styles.featureStage}>
            <Image
              className={styles.featureImage}
              src="/product/progress-feature.png"
              width={804}
              height={1380}
              alt="根据真实学习情况生成的复习曲线"
            />
          </div>
        </div>
      </section>

      <section className={styles.principles}>
        <div className={styles.principlesInner}>
          <div className={styles.principleIntro}>
            <p className={styles.eyebrow}>AI 应该做什么</p>
            <h2>少一点黑箱。<br />多一点确定。</h2>
          </div>
          <div className={styles.principleList}>
            <article>
              <span>01</span>
              <div>
                <h3>提炼，而不是编造</h3>
                <p>每张卡保留原文位置，答案随时可以回查。</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>推荐，而不是替代</h3>
                <p>AI 给出建议，用户确认、纠错并收藏真正的重点。</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>适量，而不是堆积</h3>
                <p>根据薄弱程度控制复习量，不制造新的学习压力。</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.downloadUnit} id="download">
        <div className={styles.downloadInner}>
          <div className={styles.downloadCopy}>
            <p className={styles.eyebrow}>Android Demo</p>
            <h2>现在，<br />装进手机。</h2>
            <p>真实安装包，无需应用商店。下载后即可体验完整流程。</p>
            <div className={styles.downloadActions}>
              <a className={styles.downloadButton} href={apkUrl}>
                <Download size={19} /> 下载 APK
              </a>
              <a className={styles.downloadLink} href="/app">
                先在线体验 <ArrowRight size={18} />
              </a>
            </div>
            <div className={styles.downloadMeta}>
              <span><Check size={15} /> Android 9+</span>
              <span><Check size={15} /> 作品集 Demo</span>
            </div>
          </div>
          <div className={styles.downloadStage}>
            <div className={styles.androidFrame}>
              <div className={styles.androidScreen}>
                <div className={styles.androidStatus} aria-hidden="true">
                  <span>9:41</span>
                  <i />
                  <span>● ● ●</span>
                </div>
                <Image
                  className={styles.downloadPhone}
                  src="/product/review-android.png"
                  width={804}
                  height={1600}
                  alt="药考速记 Android 应用"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <a className={styles.brand} href="#top">
            <span className={styles.brandMark}><Pill size={15} /></span>
            <span>药考速记</span>
          </a>
          <p>个人 AI 产品作品集 · 仅用于学习与面试展示</p>
          <a href="https://github.com/22duxiaoyu/yaokao-suji" target="_blank" rel="noreferrer">
            <Code2 size={16} /> GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
