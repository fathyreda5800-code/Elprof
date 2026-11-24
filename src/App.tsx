import { useEffect, useRef, useState, type FormEvent, type InvalidEvent } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BarChart3, BookOpen, Bookmark, ChevronLeft, ChevronRight, CircleCheck, Clock3, Eye, EyeOff, FileText, Home, LockKeyhole, LogOut, Menu, Play, Star, Target, UserRound, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import './App.css'

type QuestionItem = { text: string; options: string[]; correct: number; explanation: string; imageUrl?: string; videoUrl?: string; streamableEmbedUrl?: string; googleDriveEmbedUrl?: string }

const STREAMABLE_FIRST_QUESTION_URL = 'https://streamable.com/e/t3fsna?autoplay=1&loop=0'
const QUESTION_2_DRIVE_EMBED_URL = 'https://drive.google.com/file/d/1707Mee8opmvlCsv6gdT6PGFB6bUTiBA8/preview'
const SUMMARY_ANSWER_KEYS = ['ا', 'ب', 'ج', 'ج', 'ب', 'ب', 'ج', 'ب', 'ج', 'ب', 'ا', 'ب', 'ب', 'د', 'د', 'ا', 'د', 'ب', 'ج', 'د', 'ج', 'ب', 'د', 'ا', 'ب', 'د', 'د', 'د', 'د', 'ب', 'ج', 'ب', 'ا', 'د', 'ج', 'د', 'د', 'ب', 'ج', 'ب', 'ب', 'ج', 'د', 'ا', 'ا', 'ا', 'ج', 'ب', 'ا', 'د', 'ج', 'ج', 'ب', 'ب', 'ج']
const SUMMARY_CORRECT_INDEXES = SUMMARY_ANSWER_KEYS.map(answer => ['ا', 'ب', 'ج', 'د'].indexOf(answer))
const MODEL_ANSWER_KEYS: Record<number, readonly string[]> = {
  2: 'ج ب ب ب ب ج ب د د ب ب ج ا ا ب ج ج ب ج ب ج ا ج ا ا ا ج د ج ب د ا ا ب د ب ب ب ج ج ب ج ا ج ا د ج ب ج ا د ا د ا د'.split(' '),
  3: 'د ج ج ا ج ا ج ب ب ب د ج ا ج ا ب د ج ا ا ج ب د ج د ج د ج ج ا ج ب ب ج ج ب ج ج ا د ج ب ب ج ا ب ج ب ج ج ب ج ب ا ا'.split(' '),
  4: 'ج ا د ج ا ج ب ج ا ا د د ب ا ب د ب د د ب ج ب ج ج ا ب ج ا ج ج ب ا ب ب د ب ب ب ب ج ج ج د ب د ب ب ج ا ب د ب د ا'.split(' '),
  5: 'ا د ج د ب ج ب ب ب ب ج ب ا د ج د ج ا ا ب ا ب ا ا ج د ج ج د ب ج ج ج ب ب د ج ب ب ب ب ب ج ج ب ا ب ب ج ب د ا ج ج ا'.split(' '),
  6: 'ب د ج ا ا ب ب د ا ب ب ج د د ج ب ا ب ج ج ج د ب ا ب ج ا ب ب ا ب ب ا ب ا ب ب ج د ب ب ب ب ب ج ب ا ا ج ا ج ا ج ج ا'.split(' '),
  7: 'ا ا ج ب ج ج ج ا ج ا د ج ب ا د ا ج ا د ا ب ج د ا ب ج ب ا ج ب ج ج ا ا ب د د ب ج ج د ا ب د ب د ا ب د ج ج ج ا د ب'.split(' '),
  8: 'ج ب ب د ب ا ا ا د د ا ا ا ا د ب ا ج د د ج د ج ا ج ب ج ج د ب ج ا ا ا ب ب ا ب ب ا ج ا ب ب ا ج ا ج ب ا ج ا ا د ج'.split(' '),
  9: 'ب ب ج ب ج ا ا د ا د ج ج ا ب ج ا ج د ب ب ب ج ج ب د ب ا ج ا ب ج ج ا ب ا ج ب د د ب ج د ا ب ا د د ا ا ج د د ا ب ا'.split(' '),
  10: 'ب ب ج د ج ا د ج ب ب د ا ج ا ب ج ا ب ج د ا ج ج ا د ج ج ا د د د ج ب ب ا د د د ب ا د ا ب د ج د ب ج ج ب ا ب ا ج ج'.split(' ')
}
const MODEL_QUESTION_COUNTS: Record<number, number> = { 2: 55, 3: 54, 4: 54, 5: 55, 6: 55, 7: 55, 8: 55, 9: 55, 10: 55 }
const MODEL_PNG_QUESTION_NUMBERS: Record<number, readonly number[]> = { 4: [54], 5: [37], 9: [49, 53], 10: [12] }

function getAnswerIndex(answer: string) {
  switch (answer) {
    case 'ا':
    case 'أ': return 0
    case 'ب': return 1
    case 'ج': return 2
    case 'د': return 3
    default: throw new Error(`Unknown answer key: ${answer}`)
  }
}

const models = [
  { id: 1, title: 'الزبدة 1', subject: 'القدرات العامة والتحصيلي', questions: 55, duration: 25, description: 'تدريب شامل على أهم المهارات.' },
  ...Object.entries(MODEL_QUESTION_COUNTS).map(([id, questions]) => ({
    id: Number(id),
    title: `الزبدة ${id}`,
    subject: 'القدرات العامة والتحصيلي',
    questions,
    duration: 25,
    description: id === '3'
      ? 'النموذج الثالث؛ تتوفر حاليًا صور 54 سؤالًا.'
      : `النموذج ${id} من نماذج الزبدة.`
  }))
]

const quantQuestions: QuestionItem[] = [
  ...Array.from({ length: 55 }, (_, questionIndex): QuestionItem => ({
    text: '',
    options: ['', '', '', ''],
    correct: SUMMARY_CORRECT_INDEXES[questionIndex],
    explanation: '',
    imageUrl: `${import.meta.env.BASE_URL}zobda-questions/question-${String(questionIndex + 1).padStart(2, '0')}.jpg`,
    ...(questionIndex === 0
      ? { streamableEmbedUrl: STREAMABLE_FIRST_QUESTION_URL }
      : questionIndex === 1 ? { googleDriveEmbedUrl: QUESTION_2_DRIVE_EMBED_URL } : {})
  }))
]

function createModelQuestions(modelId: number): QuestionItem[] {
  const answerKeys = MODEL_ANSWER_KEYS[modelId]
  const questionCount = MODEL_QUESTION_COUNTS[modelId]
  if (!answerKeys || !questionCount || answerKeys.length < questionCount) {
    throw new Error(`Missing question or answer data for model ${modelId}`)
  }

  const pngQuestionNumbers = MODEL_PNG_QUESTION_NUMBERS[modelId] || []
  return Array.from({ length: questionCount }, (_, questionIndex) => {
    const questionNumber = questionIndex + 1
    const extension = pngQuestionNumbers.includes(questionNumber) ? 'png' : 'jpg'
    return {
      text: '',
      options: ['', '', '', ''],
      correct: getAnswerIndex(answerKeys[questionIndex]),
      explanation: '',
      imageUrl: `${import.meta.env.BASE_URL}zobda${modelId}-questions/question-${String(questionNumber).padStart(2, '0')}.${extension}`
    }
  })
}

const questionBanks: Record<number, QuestionItem[]> = {
  1: quantQuestions,
  ...Object.fromEntries(Object.keys(MODEL_QUESTION_COUNTS).map(id => [Number(id), createModelQuestions(Number(id))]))
}

const TEACHER_EMAIL = 'ahmed@gmail.com'
const EMAIL_OTP_LENGTH = 6

type Model = { id: number; title: string; subject: string; questions: number; duration: number; description: string; createdAt?: number; questionCount?: number; questionItems?: QuestionItem[]; videoUrl?: string }
type StudentProfile = { id: string; full_name: string; email: string; phone: string; created_at: string }
type TestItem = { number: string; subject: string; title: string }
type ModelResult = { correctAnswers: number; totalQuestions: number }

const testSubjects: TestItem[] = [
  { number: '1', subject: 'القدرات العامة والتحصيلي', title: 'النموذج الأول' }
]
const testUrl = 'https://forms.gle/afmX4JTFizvmTQvt8'
const savedTestsStorageKey = 'elprof_saved_tests'
const modelResultsStorageKey = 'elprof_model_results'

function isModelResult(value: unknown): value is ModelResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const result = value as { correctAnswers?: unknown; totalQuestions?: unknown }
  return typeof result.correctAnswers === 'number'
    && Number.isSafeInteger(result.correctAnswers)
    && result.correctAnswers >= 0
    && typeof result.totalQuestions === 'number'
    && Number.isSafeInteger(result.totalQuestions)
    && result.totalQuestions > 0
    && result.correctAnswers <= result.totalQuestions
}

function readModelResults(): Record<string, ModelResult> {
  const rawResults = localStorage.getItem(modelResultsStorageKey)
  if (!rawResults) return {}
  try {
    const parsed: unknown = JSON.parse(rawResults)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, ModelResult] => isModelResult(entry[1]))
    )
  } catch (error) {
    console.error('Unable to read saved model results.', error)
    return {}
  }
}

function getAutoplayYouTubeUrl(videoUrl: string, origin: string) {
  const url = new URL(videoUrl)
  url.searchParams.set('autoplay', '1')
  url.searchParams.set('origin', origin)
  url.searchParams.set('rel', '0')
  return url.toString()
}

function useSavedTests() {
  const [savedTestIds, setSavedTestIds] = useState(() => (
    (localStorage.getItem(savedTestsStorageKey) || '').split(',').filter(Boolean)
  ))

  const toggleSavedTest = (testId: string) => {
    const next = savedTestIds.includes(testId)
      ? savedTestIds.filter(id => id !== testId)
      : [...savedTestIds, testId]
    localStorage.setItem(savedTestsStorageKey, next.join(','))
    setSavedTestIds(next)
  }

  return { savedTestIds, toggleSavedTest }
}

function TestCard({ test, saved, onToggleSaved, showAvailability = true }: { test: TestItem; saved: boolean; onToggleSaved: (testId: string) => void; showAvailability?: boolean }) {
  const [openDetails, setOpenDetails] = useState(false)

  return <section className="first-test-card" >
    <div className="first-test-card-head">
      <div className="test-number"><FileText size={24}/><span>نموذج اختبار</span><strong>{test.number}</strong></div>
      <div className="test-card-status-group">
        <button
          type="button"
          className={`save-test-button ${saved ? 'is-saved' : ''}`}
          aria-label={saved ? `إزالة ${test.title} من المحتوى المحفوظ` : `حفظ ${test.title} في المحتوى المحفوظ`}
          aria-pressed={saved}
          title={saved ? 'إزالة من المحتوى المحفوظ' : 'حفظ في المحتوى المحفوظ'}
          onClick={() => onToggleSaved(test.number)}
        >
          <Star size={21} fill={saved ? 'currentColor' : 'none'}/>
        </button>
        {showAvailability && <span className="test-status">متاح الآن</span>}
      </div>
    </div>
    <div className="first-test-info">
      <div><span>المادة</span><b>{test.subject}</b></div>
      <div><span>الاختبار</span><b>{test.title}</b></div>
    </div>
    {openDetails && <div className="test-details">
      <strong>تفاصيل الاختبار</strong>
      <p>اختبار تدريبي متاح عبر نموذج Google Forms مخصص للنموذج رقم {test.number}.</p>
    </div>}
    <div className="first-test-actions">
      <button className="first-test-details" type="button" onClick={() => setOpenDetails(value => !value)}>
        <ChevronRight size={18}/>{openDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
      </button>
      <button className="first-test-start" type="button" onClick={() => window.open(testUrl, '_blank', 'noopener,noreferrer')}>
        ابدأ الاختبار <ChevronRight size={18}/>
      </button>
    </div>
  </section>
}

function Logo({ compact = false }: { compact?: boolean }) { return <div className={ `logo ${compact ? 'compact' : ''}` }> <img src={`${import.meta.env.BASE_URL}elprof-brand.png`} alt = "ELPROF — القدرات والتحصيلي" /> </div> }

function Welcome() { const navigate = useNavigate(); return <main className="welcome-screen" > <div className="welcome-card" > <div className="welcome-logo" > <Logo/><p>في القدرات والتحصيلي</p > <span>طريقك للتميز يبدأ من هنا </span></div > <div className="welcome-actions" > <button className="btn primary" onClick = {()=> navigate('/login') }> تسجيل الدخول </button><button className="btn outline" onClick={()=>navigate('/register')}>إنشاء حساب</button></div></div></main>}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate()
  const goBack = useGoBack('/')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fullName, setFullName] = useState('')
  const [account, setAccount] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setAuthError('')
    if (busy) return
    if (mode === 'register' && password !== confirmPassword) {
      setAuthError('كلمتا المرور غير متطابقتين.')
      return
    }
    const cleanFullName = fullName.trim()
    if (mode === 'register' && cleanFullName.split(/\s+/).filter(Boolean).length < 2) {
      setAuthError('اكتب الاسم الثنائي على الأقل (الاسم الأول واسم العائلة).')
      return
    }
    const cleanPhone = phone.trim()
    if (mode === 'register' && !/^\d{11}$/.test(cleanPhone)) {
      setAuthError('رقم الجوال يجب أن يتكون من 11 رقمًا.')
      return
    }

    if (!supabase) {
      setAuthError('خدمة الحسابات غير متاحة حاليًا. تحقق من إعدادات Supabase.')
      return
    }

    setBusy(true)
    try {
      const cleanAccount = account.trim().toLowerCase()
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanAccount,
          password,
          options: {
            data: { full_name: cleanFullName, phone: cleanPhone }
          }
        })
        if (error) {
          setAuthError(error.message.includes('504')
            ? 'انتهت مهلة الاتصال بـ Supabase (504). قد يكون الحساب أُنشئ دون وصول رسالة التأكيد؛ تحقق من Authentication → Users قبل إعادة المحاولة.'
            : `تعذر إنشاء الحساب: ${error.message}`)
          return
        }
        if (!data.user) {
          setAuthError('لم يتم إنشاء الحساب. حاول مرة أخرى.')
          return
        }
        if (data.session) {
          await supabase.auth.signOut()
          setAuthError('تأكيد البريد الإلكتروني غير مفعّل في Supabase. فعّله قبل التسجيل.')
          return
        }
        navigate('/verify-email', { state: { email: cleanAccount, purpose: 'signup' } })
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanAccount,
        password
      })
      if (error || !data.user) {
        const isInvalidCredentials = error?.message.toLowerCase() === 'invalid login credentials'
        setAuthError(isInvalidCredentials
          ? 'بيانات الدخول غير صحيحة. إذا كنت تنشئ حسابًا جديدًا، اختر «إنشاء حساب».'
          : error?.message || 'تعذر تسجيل الدخول.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', data.user.id)
        .maybeSingle()
      if (profileError) {
        setAuthError('تم تسجيل الدخول، لكن تعذر التحقق من صلاحيات الحساب.')
        return
      }
      const role = profile?.role || 'student'
      const metadataName = data.user.user_metadata?.full_name
      const accountName = (typeof metadataName === 'string' ? metadataName.trim() : '')
        || profile?.full_name?.trim()
        || data.user.email?.split('@')[0]
        || 'الطالب'
      localStorage.setItem('elprof_role', role)
      if (role === 'teacher' && data.user.email?.toLowerCase() === TEACHER_EMAIL) {
        localStorage.removeItem('elprof_student_name')
        localStorage.setItem('elprof_teacher_name', accountName)
        navigate('/dashboard')
        return
      }

      localStorage.removeItem('elprof_teacher_name')
      localStorage.setItem('elprof_student_name', accountName)
      localStorage.setItem('elprof_role', 'student')
      navigate('/dashboard')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'تعذر الاتصال بخدمة الحسابات.')
    } finally {
      setBusy(false)
    }
  }
  return <main className={ `auth-page ${mode === 'register' ? 'register-page' : 'login-page'}` }>
    <div className="auth-brand" > <Logo/><p>طريقك للتميز يبدأ من هنا</p > </div>
      <form className="auth-card" onSubmit={submit} onInvalidCapture={(event: InvalidEvent<HTMLFormElement>) => {
        const field = event.target
        if (!(field instanceof HTMLInputElement)) return
        if (field.name === 'phone' && (field.validity.patternMismatch || field.validity.tooShort || field.validity.tooLong)) {
          setAuthError('رقم الجوال يجب أن يتكون من 11 رقمًا.')
          return
        }
        const fieldNames: Record<string, string> = {
          full_name: 'الاسم الكامل',
          email: 'البريد الإلكتروني',
          phone: 'رقم الجوال',
          password: 'كلمة المرور',
          confirm_password: 'تأكيد كلمة المرور',
          terms: 'الموافقة على الشروط'
        }
        setAuthError(`راجع خانة «${fieldNames[field.name] || 'البيانات المطلوبة'}»؛ يبدو أنها فارغة أو غير صالحة.`)
      }}>
        <button type="button" className="back-btn" onClick={goBack}><ChevronRight size={24}/></button>
  <h1>{ mode=== 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h1>
{ authError && <div className="notice error" role="alert">{authError}</div>}
{ busy && <div className="notice success" role="status">جارٍ الاتصال بـ Supabase {mode === 'register' ? 'لإنشاء الحساب وإرسال رمز التحقق...' : 'لتسجيل الدخول...'}</div>}

{ mode === 'register' && <label className="auth-field" > <span className="field-icon" > <UserRound size={ 21 } /></span > <span className="field-control" > <b>الاسم الكامل </b><input name="full_name" required value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name" spellCheck={false} placeholder=""/ > </span></label >}
<label className="auth-field" > <span className="field-icon" > <UserRound size={ 21 } /></span > <span className="field-control" > <b>{ mode=== 'login' ? 'البريد الإلكتروني أو رقم الجوال' : 'البريد الإلكتروني'}</b><input name="email" required value={account} onChange={e=>setAccount(e.target.value)} autoComplete="email" spellCheck={false} type={mode==='register'?'email':'text'} placeholder=""/ > </span></label >
  { mode=== 'register' && <label className="auth-field" > <span className="field-icon phone-icon" > <b>+966 </b></span > <span className="field-control" > <b>رقم الجوال </b><input name="phone" type="tel" required minLength={11} maxLength={11} pattern="[0-9]{11}" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" spellCheck={false} inputMode="numeric" placeholder=""/ > </span></label >}
  { mode=== 'register' && <p className="auth-privacy-note">ستظهر بيانات التواصل للمدرس المخوّل بإدارة المنصة.</p>}
<label className="auth-field" > <span className="field-icon" > <LockKeyhole size={ 20 } /></span > <span className="field-control" > <b>كلمة المرور </b><input name="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='register'?'new-password':'current-password'} spellCheck={false} minLength={6} type={show?'text':'password'} placeholder=""/ > <button type="button" className = "field-eye" onClick = {()=> setShow(!show)}> { show?<EyeOff size = { 19 }/>: <Eye size={ 19 } />}</button > </span></label >
  { mode=== 'register' && <label className="auth-field" > <span className="field-icon" > <LockKeyhole size={ 20 } /></span > <span className="field-control" > <b>تأكيد كلمة المرور </b><input name="confirm_password" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" spellCheck={false} minLength={6} type={show?'text':'password'} placeholder=""/ > </span></label >}

{ mode === 'register' && <label className="check register-check" > <input name="terms" required type = "checkbox" /> <span>أوافق على الشروط والأحكام </span></label >}
{ mode === 'login' && <div className="form-row" > <label className="check" > <input type="checkbox" /> <span>تذكرني </span></label > <button type="button" className = "link" onClick = {()=> navigate('/forgot-password') }> نسيت كلمة المرور؟</button></div >}

<button className="btn primary full auth-submit" type="submit" disabled={busy}>{busy ? mode === 'login' ? 'جارٍ تسجيل الدخول...' : 'جارٍ إنشاء الحساب...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</button>
{ mode === 'login' && <button type="button" className = "btn outline full auth-secondary" onClick = {()=> navigate('/register') }> إنشاء حساب </button>}
{
  mode === 'register' && <div className="auth-switch" > <span>لديك حساب بالفعل؟</span><button type="button" onClick={()=>navigate('/login')}>تسجيل الدخول</button></div>}
    </form>
    </main>
}

function ForgotPassword() {
  const navigate = useNavigate()
  const goBack = useGoBack('/login')
  const [account, setAccount] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    if (!supabase) {
      setErrorMessage('خدمة الحسابات غير متاحة حاليًا.')
      return
    }

    setBusy(true)
    try {
      const email = account.trim().toLowerCase()
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) {
        setErrorMessage(error.message)
        return
      }
      navigate('/verify-email', { state: { email, purpose: 'recovery' } })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر إرسال رمز الاستعادة.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-page reset-page" >
    <form className="auth-card reset-card" onSubmit = { submit } >
      <button type="button" className="back-btn" onClick={goBack}><ChevronRight size={24}/></button>
  <h1>استعادة كلمة المرور </h1>
{ errorMessage && <div className="notice error" role="alert">{errorMessage}</div>}
<label className="auth-field" > <span className="field-icon" > <UserRound size={ 21 } /></span > <span className="field-control" > <b>البريد الإلكتروني </b><input required type="email" value={account} onChange={e=>setAccount(e.target.value)} autoComplete="email" spellCheck={false} placeholder=""/ > </span></label >
  <button className="btn primary full auth-submit" type="submit" disabled={busy}>{busy ? 'جارٍ إرسال الرمز...' : 'إرسال كود الاستعادة'}</button>
    < button type = "button" className = "reset-login" onClick = {()=> navigate('/login')}> العودة لتسجيل الدخول </button>
      </form>
      </main>
}

function ResetCode() {
  const navigate = useNavigate()
  const location = useLocation()
  const verification = location.state as { email?: string; purpose?: 'signup' | 'recovery' } | null
  const account = verification?.email || ''
  const purpose = verification?.purpose
  const goBack = useGoBack(purpose === 'signup' ? '/register' : '/forgot-password')
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const [code, setCode] = useState(() => Array.from({ length: EMAIL_OTP_LENGTH }, () => ''))
  const [seconds, setSeconds] = useState(60)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (seconds <= 0) return
    const timer = setInterval(() => setSeconds(v => Math.max(0, v - 1)), 1000)
    return () => clearInterval(timer)
  }, [seconds])

  const update = (index: number, value: string) => {
    const digits = value.replace(/[^0-9]/g, '')
    if (digits.length > 1) {
      const next = digits.slice(0, EMAIL_OTP_LENGTH).split('')
      setCode(Array.from({ length: EMAIL_OTP_LENGTH }, (_, i) => next[i] || ''))
      inputs.current[Math.min(next.length, EMAIL_OTP_LENGTH - 1)]?.focus()
      return
    }
    const clean = digits.slice(-1)
    setCode(current => current.map((item, i) => i === index ? clean : item))
    if (clean && index < code.length - 1) inputs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) inputs.current[index - 1]?.focus()
  }

  const resend = async () => {
    if (!supabase || !account || seconds > 0 || busy || !purpose) return
    setBusy(true)
    setErrorMessage('')
    setMessage('')
    try {
      const result = purpose === 'signup'
        ? await supabase.auth.resend({ type: 'signup', email: account })
        : await supabase.auth.resetPasswordForEmail(account)
      if (result.error) {
        setErrorMessage(result.error.message)
        return
      }
      setSeconds(60)
      setMessage('تم إرسال رمز جديد إلى بريدك الإلكتروني.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر إعادة إرسال الرمز.')
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setMessage('')
    if (!supabase || !purpose || !account) {
      setErrorMessage('بيانات التحقق غير مكتملة. ارجع إلى صفحة التسجيل وابدأ من جديد.')
      return
    }
    const token = code.join('')
    if (token.length !== EMAIL_OTP_LENGTH) {
      setErrorMessage(`أدخل رمز التحقق المكوّن من ${EMAIL_OTP_LENGTH} أرقام.`)
      return
    }

    setBusy(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: account,
        token,
        type: purpose === 'signup' ? 'email' : 'recovery'
      })
      if (error) {
        setErrorMessage(error.message)
        return
      }
      if (purpose === 'recovery') {
        navigate('/reset-password', { replace: true })
        return
      }
      const user = data.user
      if (!user) {
        setErrorMessage('تم التحقق، لكن تعذر إنشاء جلسة الحساب. حاول تسجيل الدخول.')
        return
      }
      const metadataName = user.user_metadata?.full_name
      const name = typeof metadataName === 'string' && metadataName.trim()
        ? metadataName.trim()
        : user.email?.split('@')[0] || 'الطالب'
      localStorage.setItem('elprof_role', 'student')
      localStorage.setItem('elprof_student_name', name)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر التحقق من الرمز.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-page reset-code-page" >
    <form className="auth-card reset-code-card" onSubmit = { submit } >
      <button type="button" className="back-btn" onClick={goBack}><ChevronRight size={24}/></button>
  <h1>{purpose === 'signup' ? 'تأكيد البريد الإلكتروني' : 'استعادة كلمة المرور'}</h1>
    < div className = "code-mail-icon" > <div className="mail-envelope" > <span>✓</span></div > </div>
      <p className="code-message">أدخل رمز التحقق المكوّن من {EMAIL_OTP_LENGTH} أرقام المرسل إلى<br/><strong>{account || 'بريدك الإلكتروني'}</strong></p>
      {message && <div className="notice success" role="status">{message}</div>}
      {errorMessage && <div className="notice error" role="alert">{errorMessage}</div>}
        <div className="code-inputs" dir = "ltr" >
          {code.map((digit, index) => <input key={index} ref={element => { inputs.current[index] = element }} aria-label={`رقم ${index + 1}`} value={digit} onChange={e => update(index, e.target.value)} onKeyDown={e => handleKeyDown(index, e.key)} inputMode="numeric" maxLength={EMAIL_OTP_LENGTH} autoComplete={index === 0 ? 'one-time-code' : 'off'}/>)}
</div>
  < p className = "code-resend" > إعادة إرسال الرمز خلال < b > { seconds ? `00:${String(seconds).padStart(2, '0')}` : 'الآن'}</b></p >
    {seconds === 0 && <button type="button" className="resend-code" onClick={resend} disabled={busy}>إعادة إرسال الرمز</button>}
<button className="btn primary full auth-submit" type="submit" disabled={busy || code.join('').length !== EMAIL_OTP_LENGTH}>{busy ? 'جارٍ التحقق...' : 'تأكيد الرمز'}</button>
  < button type = "button" className = "reset-login" onClick = {()=> navigate(purpose === 'signup' ? '/register' : '/forgot-password')}> تغيير البريد الإلكتروني </button>
    </form>
    </main>
}

function ResetPassword() {
  const navigate = useNavigate()
  const goBack = useGoBack('/forgot-password')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    if (password !== confirmPassword) {
      setErrorMessage('كلمتا المرور غير متطابقتين.')
      return
    }
    if (!supabase) {
      setErrorMessage('خدمة الحسابات غير متاحة حاليًا.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setErrorMessage(error.message)
        return
      }
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تغيير كلمة المرور.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-page reset-page">
    <form className="auth-card reset-card" onSubmit={submit}>
      <button type="button" className="back-btn" onClick={goBack}><ChevronRight size={24}/></button>
      <h1>تعيين كلمة مرور جديدة</h1>
      {errorMessage && <div className="notice error" role="alert">{errorMessage}</div>}
      <label className="auth-field"><span className="field-icon"><LockKeyhole size={20}/></span><span className="field-control"><b>كلمة المرور الجديدة</b><input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}/></span></label>
      <label className="auth-field"><span className="field-icon"><LockKeyhole size={20}/></span><span className="field-control"><b>تأكيد كلمة المرور</b><input required minLength={6} type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/></span></label>
      <button className="btn primary full auth-submit" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}</button>
    </form>
  </main>
}

function useGoBack(fallback = '/dashboard') {
  const navigate = useNavigate()
  return () => {
    const historyIndex = window.history.state?.idx
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1)
      return
    }
    navigate(fallback, { replace: true })
  }
}

function Topbar({ showBack = false }: { showBack?: boolean }) {
  const goBack = useGoBack()
  return <header className="topbar">
    <div className="top-brand"><img src={`${import.meta.env.BASE_URL}elprof-header.png`} alt="ELPROF"/></div>
    <div className="top-actions">
      {showBack && <button type="button" className="header-back" aria-label="رجوع" onClick={goBack}><ChevronRight size={22}/></button>}
    </div>
  </header>
}

function Sidebar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const items = [['الرئيسية', '/dashboard', Home], ['الاختبارات', '/tests', BookOpen], ['الزبدة', '/summaries', FileText], ['نتائجى', '/results', BarChart3], ['المفضلة', '/favorites', Bookmark], ['الملف الشخصي', '/profile', UserRound]]

  return <>
    <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="القائمة"><Menu/></button>
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <button className="sidebar-close" onClick={() => setOpen(false)}><X/></button>
      <Logo compact/>
      <nav>
        {items.map(([label, path, Icon]: any) =>
          <NavLink key={path} to={path} onClick={() => setOpen(false)}>
            <Icon size={20}/><span>{label}</span>
          </NavLink>)}
      </nav>
      <button className="logout" onClick={() => { localStorage.removeItem('elprof_role'); navigate('/') }}><LogOut size={19}/>تسجيل الخروج</button>
    </aside>
  </>
}

function AppShell({ children, hideSidebar = false }: { title: string; children: any; hideSidebar?: boolean }) {
  const location = useLocation()
  const isTestsPage = location.pathname === '/tests'
  const isModelsPage = location.pathname === '/models'
  const isProfilePage = location.pathname === '/profile'
  const isSummariesPage = location.pathname === '/summaries'
  const isResultPage = location.pathname === '/results'
  const isReviewPage = location.pathname === '/review'
  const hideStandardHeader = isModelsPage || isProfilePage || isSummariesPage || isResultPage || isReviewPage
  return <div className={`app-shell ${isTestsPage ? 'tests-shell' : ''} ${isModelsPage ? 'models-shell' : ''} ${isProfilePage ? 'profile-shell' : ''} ${isSummariesPage ? 'summaries-shell' : ''} ${isResultPage ? 'result-shell' : ''} ${isReviewPage ? 'review-shell' : ''}`}> {!isTestsPage && !hideStandardHeader && !hideSidebar && <Sidebar/>}<main className="main-area">{!hideStandardHeader && <Topbar showBack={location.pathname !== '/dashboard'} />}{children}</main><nav className="bottom-nav"><NavLink to="/dashboard"><Home/><span>الرئيسية</span></NavLink><NavLink to="/tests"><FileText/><span>الاختبارات</span></NavLink><NavLink to="/profile"><UserRound/><span>حسابي</span></NavLink></nav></div>
}

function Dashboard() {
  const navigate = useNavigate()
  const { name: studentName, error: nameError } = useAccountName('الطالب')
  const modelResults = Object.values(readModelResults())
  const completedModels = modelResults.length
  const correctAnswers = modelResults.reduce((total, result) => total + result.correctAnswers, 0)
  const totalQuestions = modelResults.reduce((total, result) => total + result.totalQuestions, 0)
  const successRate = totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100) : 0

  return <AppShell title="الرئيسية" >
    <main className="student-home" >
      <section className="student-welcome" >
        <div className="student-header"><img className="dashboard-brand" src={`${import.meta.env.BASE_URL}elprof-header.png`} alt="ELPROF"/></div>
          < h1 > <span>مرحباً بك.</span> {studentName} 👋</h1 >
            {nameError && <p className="account-name-warning" role="status">{nameError}</p>}
            <p>مستعد لليوم الجديد؟</p>
              </section>

              < section className = "student-progress" >
                <div className="progress-ring" style = {{ '--progress': `${successRate * 3.6}deg` } as any
}> <div><strong>{ successRate } % </strong></div > </div>
  < div className = "progress-stats" > <h2>تقدمك العام </h2><div><span>النماذج المكتملة</span > <b>{ completedModels } </b></div > <div><span>الإجابات الصحيحة </span><b>{correctAnswers}</b > </div><div><span>معدل النجاح</span > <b>{ successRate } % </b></div > </div>
    </section>

    < section className = "student-choosing" > <h2>اختر ما تريد البدء به </h2><div className="student-feature-grid"><button onClick={()=>navigate('/models')}><span className="feature-symbol"><ClipboardIcon/></span><strong>النماذج</strong><small>تدريب وحل اختبارات</small></button><button onClick={()=>navigate('/summaries')}><span className="feature-symbol"><BookOpen/></span><strong>الزبدة</strong><small>ملخصات ومراجعات</small></button></div></section>
      </main>
      </AppShell>
}

function ClipboardIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" > <rect x="5" y = "4" width = "14" height = "16" rx = "2" /> <path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4" /> </svg> }

function Models() {
  const goBack = useGoBack('/dashboard')
  return <AppShell title="النماذج" >
    <main className="models-page-reset">
      <section className="models-page-header">
        <button type="button" aria-label="رجوع" onClick={goBack}>
          <ChevronRight size={24}/>
        </button>
        <img className="models-header-logo" src={`${import.meta.env.BASE_URL}elprof-models-logo.png`} alt="ELPROF"/>
      </section>
      <section className="models-empty-illustration" aria-label="النماذج قريباً">
        <img src={`${import.meta.env.BASE_URL}models-empty.png`} alt="قريباً — النماذج"/>
      </section>
    </main>
  </AppShell>
}

function Tests() {
  const { savedTestIds, toggleSavedTest } = useSavedTests()

  return <AppShell title="الاختبارات" > <main className="tests-page-reset" >
    <section className="first-test-header" > <div><h1>الاختبارات المتاحة </h1><p>اختبر نفسك من نماذج ELPROF</p > </div><span><ClipboardIcon/ > </span></section >
      {testSubjects.map(test => <TestCard
        key={test.number}
        test={test}
        saved={savedTestIds.includes(test.number)}
        onToggleSaved={toggleSavedTest}
      />)}
  </main></AppShell >
}

function Summaries() {
  const navigate = useNavigate()
  const goBack = useGoBack('/dashboard')
  let custom: Model[] = []
  try { custom = JSON.parse(localStorage.getItem('elprof_custom_tests') || '[]') } catch { custom = [] }
  const [remoteModels, setRemoteModels] = useState<Model[]>([])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('models')
      .select('id,title,subject,description,question_count,duration,is_published')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        setRemoteModels(data.map((item: any) => ({
          id: item.id,
          title: item.title,
          subject: item.subject,
          questions: item.question_count,
          questionCount: item.question_count,
          duration: item.duration,
          description: item.description
        })))
      })
  }, [])

  const allModels: Model[] = [
    ...models,
    ...remoteModels.filter(model => !models.some(localModel => localModel.id === model.id)),
    ...custom.filter(model => !models.some(localModel => localModel.id === model.id))
  ]

  return <AppShell title="زبدة" >
    <main className="summaries-page-reset">
      <section className="summaries-page-header">
        <button type="button" aria-label="رجوع" onClick={goBack}>
          <ChevronRight size={24}/>
        </button>
        <img className="summaries-header-logo" src={`${import.meta.env.BASE_URL}elprof-models-logo.png`} alt="ELPROF"/>
      </section>
      <section className="summaries-content">
        <div className="summaries-heading">
          <h1>زبدة ELPROF</h1>
          <p>ملخصات تعليمية متاحة الآن</p>
        </div>
        <div className="summary-grid">
          {allModels.map(model => <article className="summary-card" key={model.id}>
            <div className="summary-card-head">
              <span>القدرات العامة والتحصيلي</span>
              <b>متاح الآن</b>
            </div>
            <h2>{model.title}</h2>
            <p>{model.description}</p>
            <div className="summary-card-info">
              <span><FileText size={17}/>{model.questionItems?.length ?? model.questionCount ?? model.questions} سؤال</span>
            </div>
            <button type="button" className="summary-start" onClick={() => navigate(`/exam/${model.id}`)}>
              ابدأ الاختبار <ChevronLeft size={18}/>
            </button>
          </article>)}
        </div>
      </section>
    </main>
  </AppShell>
}
function Exam() {
  const { id } = useParams()
  const navigate = useNavigate()
  const goBack = useGoBack('/dashboard')
  let custom: Model[] = []
  try { custom = JSON.parse(localStorage.getItem('elprof_custom_tests') || '[]') } catch { custom = [] }
  const model: Model = models.find(m => m.id === Number(id)) || custom.find(m => m.id === Number(id)) || models[0]
  const [remoteModel, setRemoteModel] = useState<Model | null>(null)
  const [remoteQuestions, setRemoteQuestions] = useState<QuestionItem[]>([])
  useEffect(() => {
    const client = supabase
    if (!client) return
    client
      .from('models')
      .select('id,title,subject,description,question_count,duration')
      .eq('id', Number(id))
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return
        setRemoteModel({
          id: data.id,
          title: data.id === 1 ? 'الزبدة 1' : data.title,
          subject: data.subject,
          questions: data.question_count,
          duration: data.duration,
          description: data.description
        })
        const { data: questionRows } = await client
          .from('questions')
          .select('text,options,correct_index,explanation,position')
          .eq('model_id', data.id)
          .order('position', { ascending: true })
        if (questionRows) {
          setRemoteQuestions(questionRows.map((row: any, questionIndex: number) => ({
            text: row.text,
            options: row.options,
            correct: row.correct_index,
            explanation: row.explanation,
            ...(data.id === 1 ? quantQuestions[questionIndex] || {} : {})
          })))
        }
      })
  }, [id])

  const activeModel = remoteModel || model
  const sourceQuestions: QuestionItem[] = questionBanks[model.id]
    || (remoteQuestions.length ? remoteQuestions : model.questionItems?.length ? model.questionItems : quantQuestions)
  const examQuestions: QuestionItem[] = Array.from({ length: questionBanks[model.id]?.length ?? 55 }, (_, questionIndex) => {
    const sourceQuestion = sourceQuestions[questionIndex]
    if (sourceQuestion) return sourceQuestion
    return {
      text: '',
      options: ['', '', '', ''],
      correct: 0,
      explanation: ''
    }
  })
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(examQuestions.map(() => null))
  const [marked, setMarked] = useState<number[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [video, setVideo] = useState(true)
  const [playingVideoFor, setPlayingVideoFor] = useState<number | null>(null)
  const submissionHandled = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setElapsed(v => v + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const mm = Math.floor(elapsed / 60)
  const ss = elapsed % 60
  const submit = () => {
    if (submissionHandled.current) return
    submissionHandled.current = true

    const correctAnswers = examQuestions.reduce(
      (total, question, questionIndex) => total + (answers[questionIndex] === question.correct ? 1 : 0),
      0
    )
    const modelResults = readModelResults()
    modelResults[String(activeModel.id)] = {
      correctAnswers,
      totalQuestions: examQuestions.length
    }
    localStorage.setItem(modelResultsStorageKey, JSON.stringify(modelResults))

    navigate('/results', { state: { answers, questions: examQuestions, elapsed } })
  }
  const answeredCount = answers.filter(answer => answer !== null).length
  const progress = Math.round(((index + 1) / examQuestions.length) * 100)
  const currentQuestion = examQuestions[index]
  const hasVideoSource = Boolean(currentQuestion.videoUrl || currentQuestion.streamableEmbedUrl || currentQuestion.googleDriveEmbedUrl || activeModel.videoUrl)
  const isVideoModalOpen = playingVideoFor === index && hasVideoSource
  const startVideo = () => setPlayingVideoFor(index)
  const closeVideo = () => setPlayingVideoFor(null)

  useEffect(() => {
    if (!isVideoModalOpen) return

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPlayingVideoFor(null)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isVideoModalOpen])

  return <main className="exam-page">
    <header className="exam-top">
      <button type="button" className="exam-back" onClick={goBack} aria-label="رجوع"><ChevronRight size={24}/></button>
      <img className="exam-logo" src={`${import.meta.env.BASE_URL}elprof-models-logo.png`} alt="ELPROF"/>
      <div className="exam-actions">
        <div className="timer"><Clock3 size={19}/><span>{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</span></div>
        <button className="submit" onClick={submit}>إنهاء الاختبار</button>
      </div>
    </header>

    <div className="exam-progress-wrap">
      <div className="exam-progress-meta"><strong>{activeModel.title}</strong><span>{index + 1} من {examQuestions.length}</span></div>
      <div className="exam-progress"><span style={{ width: `${progress}%` }}/></div>
      <div className="exam-progress-count"><span>{answeredCount} إجابات مختارة</span><span>{marked.includes(index) ? 'معلّمة للمراجعة' : 'الوقت منذ البداية'} </span></div>
    </div>

    <div className="exam-layout">
      <aside className="question-nav">
        <h3>أسئلة الزبدة</h3>
        <div className="question-nav-grid">{examQuestions.map((_, i) => <button key={i} className={`${index === i ? 'active' : ''} ${answers[i] != null ? 'answered' : ''} ${marked.includes(i) ? 'marked' : ''}`} onClick={() => setIndex(i)}>{i + 1}</button>)}</div>
        <button className={`review ${marked.includes(index) ? 'active' : ''}`} onClick={() => setMarked(v => v.includes(index) ? v.filter(x => x !== index) : [...v, index])}><Target size={17}/>{marked.includes(index) ? 'إزالة المراجعة' : 'وضع للمراجعة'}</button>
      </aside>
      <section className="question-card">
        <div className={`question-prompt-layout ${currentQuestion.imageUrl ? (currentQuestion.text ? 'has-diagram' : 'has-diagram-only') : ''}`}>
          <h1>{currentQuestion.text}</h1>
          {currentQuestion.imageUrl && <div className="question-diagram-wrap"><img className="question-diagram" src={currentQuestion.imageUrl} alt={`صورة السؤال ${index + 1}`}/></div>}
        </div>
        <div className="options">{currentQuestion.options.map((op, i) => <button key={i} className={answers[index] === i ? 'selected' : ''} onClick={() => setAnswers(a => a.map((v, n) => n === index ? i : v))}><b>{['أ', 'ب', 'ج', 'د'][i]}</b><span>{op}</span><i><CircleCheck size={17}/></i></button>)}</div>
        <div className="q-actions">
          <button disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronRight/>السابق</button>
          <button className="skip" onClick={() => index < examQuestions.length - 1 && setIndex(index + 1)}>تخطي السؤال</button>
          <button className="next" onClick={() => index < examQuestions.length - 1 ? setIndex(index + 1) : submit()}>{index === examQuestions.length - 1 ? 'عرض النتيجة' : 'التالي'}<ChevronLeft/></button>
        </div>
      </section>
      {video && <aside className="video-float">
        <div className="video-head"><strong>شرح الإجابة</strong><button onClick={() => { setVideo(false); closeVideo() }} aria-label="إغلاق الشرح"><X size={17}/></button></div>
        {hasVideoSource
          ? <button type="button" className="video-cover" onClick={() => { void startVideo() }} aria-label="تشغيل شرح الفيديو">
            <img src={`${import.meta.env.BASE_URL}elprof-models-logo.png`} alt="ELPROF"/>
            <span className="video-cover-play"><Play fill="currentColor"/></span>
          </button>
          : <div className="video-placeholder"><img src={`${import.meta.env.BASE_URL}elprof-models-logo.png`} alt="ELPROF"/><span>لا يتوفر شرح فيديو لهذا السؤال</span></div>}
      </aside>}
      {!video && <button className="reopen-video" onClick={() => setVideo(true)}><Play size={18}/>فتح شرح السؤال</button>}
    </div>
    {isVideoModalOpen && <div
      className="video-modal-backdrop"
      onClick={event => {
        if (event.target === event.currentTarget) closeVideo()
      }}
    >
      <section className="video-modal" role="dialog" aria-modal="true" aria-label={`شرح السؤال ${index + 1}`}>
        <div className="video-modal-head">
          <strong>شرح السؤال {index + 1}</strong>
          <button type="button" onClick={closeVideo} aria-label="إغلاق الفيديو"><X size={22}/></button>
        </div>
        <div
          className="video-modal-player"
          onContextMenu={event => event.preventDefault()}
          onDragStart={event => event.preventDefault()}
        >
          {currentQuestion.streamableEmbedUrl
            ? <iframe
              className="explanation-video"
              src={currentQuestion.streamableEmbedUrl}
              title={`شرح السؤال ${index + 1}`}
              allow="autoplay; fullscreen; picture-in-picture"
              referrerPolicy="origin"
              allowFullScreen
            />
            : currentQuestion.googleDriveEmbedUrl
            ? <iframe
              className="explanation-video"
              src={currentQuestion.googleDriveEmbedUrl}
              title={`شرح السؤال ${index + 1}`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
            : currentQuestion.videoUrl
            ? <iframe
              className="explanation-video"
              src={getAutoplayYouTubeUrl(currentQuestion.videoUrl, window.location.origin)}
              title={`شرح السؤال ${index + 1}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="origin"
              allowFullScreen
            />
            : <video
              className="explanation-video"
              src={activeModel.videoUrl}
              controls
              autoPlay
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              onContextMenu={event => event.preventDefault()}
            />}
          <div className="video-watermark" aria-hidden="true">
            <span>ELPROF • محتوى تعليمي</span>
            <span>ELPROF • محتوى تعليمي</span>
            <span>ELPROF • محتوى تعليمي</span>
            <span>ELPROF • محتوى تعليمي</span>
          </div>
        </div>
      </section>
    </div>}
  </main>
}

function Results() {
  const navigate = useNavigate()
  const goBack = useGoBack('/dashboard')
  const location = useLocation()
  const state = location.state as { answers?: (number | null)[]; questions?: QuestionItem[]; elapsed?: number } | null
  const resultQuestions = state?.questions || quantQuestions
  const resultAnswers = state?.answers || resultQuestions.map(() => null)
  const correct = resultQuestions.reduce((total, question, index) => total + (resultAnswers[index] === question.correct ? 1 : 0), 0)
  const wrong = resultQuestions.length - correct
  const percentage = resultQuestions.length ? Math.round((correct / resultQuestions.length) * 100) : 0
  const passed = percentage >= 50
  const elapsed = state?.elapsed || 0
  const elapsedText = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  const openReview = () => navigate('/review', { state: { answers: resultAnswers, questions: resultQuestions } })

  return <AppShell title="النتيجة">
    <main className="result-page-reset">
      <section className="result-page-header">
        <button type="button" aria-label="رجوع" onClick={goBack}><ChevronRight size={24}/></button>
        <img src={`${import.meta.env.BASE_URL}elprof-models-logo.png`} alt="ELPROF"/>
      </section>
      <section className={`result-card premium-result ${passed ? 'passed' : 'failed'}`}>
        <div className="result-decoration result-decoration-one"/>
        <div className="result-decoration result-decoration-two"/>
        <div className="result-status-symbol">
          {passed ? <div className="trophy-mark" aria-label="نجاح">🏆</div> : <div className="failed-mark"><X size={46}/></div>}
        </div>
        <p className={passed ? 'success-text' : 'failure-text'}>{passed ? 'أحسنت! أداء رائع' : 'لا بأس، حاول مرة أخرى!'}</p>
        <h1>{passed ? 'لقد نجحت في الزبدة' : 'تحتاج إلى مزيد من التدريب'}</h1>
        <div className="score-ring"><strong>{percentage}%</strong><span>النتيجة</span></div>
        <p className="score-fraction">{correct} من {resultQuestions.length} إجابات صحيحة</p>
        <div className="result-stats">
          <div><CircleCheck/><strong>{correct}</strong><span>إجابة صحيحة</span></div>
          <div><X/><strong>{wrong}</strong><span>إجابة خاطئة</span></div>
          <div><Clock3/><strong>{elapsedText}</strong><span>الوقت المستغرق</span></div>
        </div>
        <div className="result-actions">
          <button className="btn primary" onClick={openReview}>مراجعة الإجابات</button>
          <button className="btn outline" onClick={() => navigate('/dashboard')}>العودة للرئيسية</button>
        </div>
      </section>
    </main>
  </AppShell>
}

function Review() {
  const navigate = useNavigate()
  const goBack = useGoBack('/results')
  const location = useLocation()
  const state = location.state as { answers?: (number | null)[]; questions?: QuestionItem[] } | null
  const reviewQuestions = state?.questions || quantQuestions
  const reviewAnswers = state?.answers || reviewQuestions.map(() => null)

  return <AppShell title="مراجعة الإجابات">
    <main className="review-page-reset">
      <section className="review-page-header">
        <button type="button" aria-label="رجوع" onClick={goBack}><ChevronRight size={24}/></button>
        <img src={`${import.meta.env.BASE_URL}elprof-models-logo.png`} alt="ELPROF"/>
      </section>
      <div className="review-list">
        {reviewQuestions.map((question, index) => {
          const selected = reviewAnswers[index]
          const isCorrect = selected === question.correct
          return <article className="review-card" key={`${question.imageUrl}-${index}`}>
            <div className="review-status"><span>السؤال {index + 1}</span><b className={isCorrect ? 'correct' : 'wrong'}>{isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}</b></div>
            <h2>{question.text}</h2>
            <p><b>إجابتك: </b>{selected === null ? 'لم تتم الإجابة' : ['أ', 'ب', 'ج', 'د'][selected]}</p>
            <p><b>الإجابة الصحيحة: </b>{['أ', 'ب', 'ج', 'د'][question.correct]}</p>
          </article>
        })}
      </div>
      <button type="button" className="review-back-home" onClick={() => navigate('/dashboard')}>العودة للرئيسية</button>
    </main>
  </AppShell>
}
function Profile() {
  const navigate = useNavigate()
  const goBack = useGoBack('/dashboard')
  const { status: teacherStatus } = useTeacherAccess()
  const { name: studentName, error: nameError } = useAccountName('الطالب')
  const initial = studentName.trim().charAt(0) || 'م'

  return <AppShell title="الملف الشخصي" >
    <main className="profile-page-reset">
      <section className="profile-page-header">
        <button type="button" aria-label="رجوع" onClick={goBack}>
          <ChevronRight size={24}/>
        </button>
        <img className="profile-header-logo" src={`${import.meta.env.BASE_URL}elprof-models-logo.png`} alt="ELPROF"/>
      </section>

      <section className="profile-card">
        <div className="profile-avatar">{initial}</div>
        <h1>{studentName}</h1>
        {nameError && <p className="account-name-warning" role="status">{nameError}</p>}
        <p>طالب في ELPROF</p>
      </section>

      <section className="settings-list" aria-label="إعدادات الحساب">
        {teacherStatus === 'allowed' && <SettingsRow icon={<Eye/>} title="الطلاب المسجلون" onClick={() => navigate('/teacher/students')}/>}
        <SettingsRow icon={<LockKeyhole/>} title="تغيير كلمة المرور" onClick={() => navigate('/forgot-password')}/>
        <SettingsRow icon={<Bookmark/>} title="المحتوى المحفوظ" onClick={() => navigate('/favorites')}/>
        <SettingsRow icon={<LogOut/>} title="تسجيل الخروج" danger onClick={() => { localStorage.removeItem('elprof_role'); navigate('/') }}/>
      </section>
    </main>
  </AppShell>
}
function SettingsRow({ icon, title, danger = false, onClick }: { icon: any; title: string; danger?: boolean; onClick?: () => void }) {
  return <button type="button" className={`settings-row ${danger ? 'danger-row' : ''}`} onClick={onClick}>
    <span className="settings-row-icon">{icon}</span>
    <strong>{title}</strong>
    <ChevronLeft className="settings-row-arrow" size={20}/>
  </button>
}

function useAccountName(fallbackName: string) {
  const [name, setName] = useState(() => (
    localStorage.getItem('elprof_student_name')
    || localStorage.getItem('elprof_teacher_name')
    || fallbackName
  ))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let active = true

    const loadAccountName = async () => {
      const { data: authData, error: authError } = await client.auth.getUser()
      if (authError) {
        if (active) setError('تعذر تحميل اسم الحساب.')
        return
      }
      if (!authData.user) return

      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('full_name, role')
        .eq('id', authData.user.id)
        .maybeSingle()
      if (!active) return
      if (profileError) setError('تعذر تحميل اسم الحساب.')

      const metadataName = authData.user.user_metadata?.full_name
      const accountName = (typeof metadataName === 'string' ? metadataName.trim() : '')
        || profile?.full_name?.trim()
        || authData.user.email?.split('@')[0]
        || fallbackName
      setName(accountName)

      if (profile?.role === 'teacher' && authData.user.email?.toLowerCase() === TEACHER_EMAIL) {
        localStorage.setItem('elprof_teacher_name', accountName)
        localStorage.removeItem('elprof_student_name')
      } else {
        localStorage.setItem('elprof_student_name', accountName)
        localStorage.removeItem('elprof_teacher_name')
      }
    }

    void loadAccountName()
    return () => { active = false }
  }, [fallbackName])

  return { name, error }
}

function useTeacherAccess() {
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied' | 'error'>('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const verify = async () => {
      if (!supabase) {
        if (active) {
          setError('خدمة الحسابات غير متاحة حاليًا.')
          setStatus('error')
        }
        return
      }

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) {
        if (active) {
          setError('تعذر التحقق من الحساب الحالي.')
          setStatus('error')
        }
        return
      }

      if (!authData.user || authData.user.email?.toLowerCase() !== TEACHER_EMAIL) {
        if (active) setStatus('denied')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle()
      if (profileError) {
        if (active) {
          setError('تعذر التحقق من صلاحيات المدرس.')
          setStatus('error')
        }
        return
      }

      if (active) setStatus(profile?.role === 'teacher' ? 'allowed' : 'denied')
    }

    void verify()
    return () => { active = false }
  }, [])

  return { status, error }
}

function TeacherStudents() {
  const navigate = useNavigate()
  const { status, error: accessError } = useTeacherAccess()
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'denied') navigate('/profile', { replace: true })
  }, [navigate, status])
  const displayError = error || (status === 'error' ? accessError : '')

  useEffect(() => {
    if (status !== 'allowed' || !supabase) return
    const client = supabase
    let active = true

    const loadStudents = async () => {
      setLoading(true)
      const { data, error: queryError } = await client
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false })

      if (!active) return
      if (queryError) {
        setError('تعذر تحميل بيانات الطلاب. حاول مرة أخرى.')
      } else {
        setStudents(data || [])
      }
      setLoading(false)
    }

    void loadStudents()
    return () => { active = false }
  }, [status])

  return <AppShell title="الطلاب" hideSidebar>
    <main className="teacher-students-page">
      <header className="teacher-students-heading">
        <h1>الطلاب المسجلون</h1>
      </header>
      {displayError && <div className="notice error" role="alert">{displayError}</div>}
      {loading && status === 'allowed' && <p className="students-state">جارٍ تحميل الطلاب...</p>}
      {!loading && status === 'allowed' && students.length === 0 && <p className="students-state">لا يوجد طلاب مسجلون حتى الآن.</p>}
      {status === 'allowed' && students.length > 0 && <section className="teacher-students-list" aria-label="قائمة الطلاب">
        {students.map(student => <article className="teacher-student-card" key={student.id}>
          <h2>{student.full_name || 'بدون اسم'}</h2>
          <p><strong>البريد الإلكتروني</strong><a dir="ltr" href={`mailto:${student.email}`}>{student.email || 'غير متوفر'}</a></p>
          <p><strong>رقم الجوال</strong>{student.phone ? <a dir="ltr" href={`tel:${student.phone}`}>{student.phone}</a> : <span>غير متوفر</span>}</p>
        </article>)}
      </section>}
    </main>
  </AppShell>
}

function Favorites() {
  const { savedTestIds, toggleSavedTest } = useSavedTests()
  const savedTests = testSubjects.filter(test => savedTestIds.includes(test.number))

  return <AppShell title="المحتوى المحفوظ" hideSidebar>
    <main className="tests-page-reset">
      <section className="first-test-header">
        <div><h1>المحتوى المحفوظ</h1><p>الاختبارات التي حفظتها للرجوع إليها</p></div>
        <span><Bookmark/></span>
      </section>
      {savedTests.length > 0
        ? savedTests.map(test => <TestCard
          key={test.number}
          test={test}
          saved
          showAvailability={false}
          onToggleSaved={toggleSavedTest}
        />)
        : <section className="empty-state">
          <div><Bookmark/></div>
          <h1>لا توجد اختبارات محفوظة</h1>
          <p>اضغط على نجمة الاختبار لإضافته هنا.</p>
        </section>}
    </main>
  </AppShell>
}

export default function App() {
  return <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Routes>
      <Route path="/" element={<Welcome/>}/>
      <Route path="/login" element={<AuthPage mode="login"/>}/>
      <Route path="/register" element={<AuthPage mode="register"/>}/>
      <Route path="/forgot-password" element={<ForgotPassword/>}/>
      <Route path="/verify-email" element={<ResetCode/>}/>
      <Route path="/reset-code" element={<ResetCode/>}/>
      <Route path="/reset-password" element={<ResetPassword/>}/>
      <Route path="/dashboard" element={<Dashboard/>}/>
      <Route path="/models" element={<Models/>}/>
      <Route path="/tests" element={<Tests/>}/>
      <Route path="/summaries" element={<Summaries/>}/>
      <Route path="/exam/:id" element={<Exam/>}/>
      <Route path="/results" element={<Results/>}/>
      <Route path="/review" element={<Review/>}/>
      <Route path="/profile" element={<Profile/>}/>
      <Route path="/teacher/students" element={<TeacherStudents/>}/>
      <Route path="/favorites" element={<Favorites/>}/>
      <Route path="/admin" element={<Navigate to="/dashboard" replace/>}/>
      <Route path="/admin/*" element={<Navigate to="/dashboard" replace/>}/>
      <Route path="*" element={<Dashboard/>}/>
    </Routes>
  </BrowserRouter>
}