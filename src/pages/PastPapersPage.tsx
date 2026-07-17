import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Eye, 
  Download, 
  Search, 
  X, 
  SlidersHorizontal, 
  BookOpen, 
  Layers, 
  Calendar, 
  ClipboardList, 
  RefreshCw, 
  AlertCircle, 
  Bookmark,
  Database,
  Terminal,
  Check,
  Loader2,
  Play,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { PaperCard } from '../components/PaperCard';
import { usePastPapers } from '../hooks/usePastPapers';
import { PastPaper } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db, storage, defaultStorage } from '../lib/firebase';
import { ExamCountdownWidget } from '../components/ExamCountdownWidget';

const SUBJECT_OPTIONS = [
  'Mathematics',
  'Physical Sciences'
];

const GRADE_OPTIONS = ['12'];
const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => (2025 - i).toString());

const SESSION_OPTIONS = [
  { value: 'Term2_MayJune', label: 'Term 2 (May/June)' },
  { value: 'Term3_Trial', label: 'Term 3 (Trial/Prep)' },
  { value: 'Term4_November', label: 'Term 4 (November)' },
  { value: 'Various', label: 'Various / Other' }
];

const TYPE_OPTIONS = [
  { value: 'question', label: 'Question Paper' },
  { value: 'memo', label: 'Memorandum (Memo)' }
];

const LANGUAGE_OPTIONS = ['English', 'Afrikaans'];

interface ParseMeta {
  title: string;
  subject: string;
  grade: number;
  year: number;
  curriculum: 'NSC' | 'IEB';
  paperNumber: 'P1' | 'P2' | 'P3' | 'P4';
  type: 'question' | 'memo';
  language: 'English' | 'Afrikaans';
  topics: string[];
  session: string;
  province: string;
}

const parseStorageFile = (fullPath: string, fileName: string): ParseMeta => {
  const parts = fullPath.split('/');
  const upperPath = fullPath.toUpperCase();
  const upperFile = fileName.toUpperCase();
  const normPath = upperPath.replace(/[-_]/g, ' ');
  const normFile = upperFile.replace(/[-_]/g, ' ');

  // 1. Curriculum
  let curriculum: 'NSC' | 'IEB' = 'NSC';
  if (upperPath.includes('/IEB/') || upperPath.includes('IEB')) {
    curriculum = 'IEB';
  }

  // 2. Grade
  let grade = 12;
  const gradeMatch = upperPath.match(/(GRADE|GR|G)\s*(\d+)/i) || fullPath.match(/\/(\d+)\//) || upperFile.match(/(GRADE|GR|G)\s*(\d+)/i);
  if (gradeMatch) {
    const num = parseInt(gradeMatch[2] || gradeMatch[1], 10);
    if (num >= 8 && num <= 12) {
      grade = num;
    }
  } else {
    for (const part of parts) {
      const num = parseInt(part.replace(/\D/g, ''), 10);
      if (num >= 8 && num <= 12) {
        grade = num;
        break;
      }
    }
  }

  // 3. Year
  let year = 2024;
  const yearMatch = upperFile.match(/(20\d{2})/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  } else {
    for (let i = parts.length - 1; i >= 0; i--) {
      const num = parseInt(parts[i].replace(/\D/g, ''), 10);
      if (num >= 2000 && num <= 2027) {
        year = num;
        break;
      }
    }
  }

  // 4. Paper Number
  let paperNumber: 'P1' | 'P2' | 'P3' | 'P4' = 'P1';
  if (upperFile.includes('_P1') || upperFile.includes('-P1') || upperFile.includes(' P1') || upperFile.includes(' P_1') || upperFile.includes(' PAPER 1') || upperFile.includes(' PAPER1') || upperFile.includes('_V1') || upperFile.includes(' V1') || upperFile.includes('-V1') || upperFile.includes('_V_1')) {
    paperNumber = 'P1';
  } else if (upperFile.includes('_P2') || upperFile.includes('-P2') || upperFile.includes(' P2') || upperFile.includes(' P_2') || upperFile.includes(' PAPER 2') || upperFile.includes(' PAPER2') || upperFile.includes('_V2') || upperFile.includes(' V2') || upperFile.includes('-V2') || upperFile.includes('_V_2')) {
    paperNumber = 'P2';
  } else if (upperFile.includes('_P3') || upperFile.includes('-P3') || upperFile.includes(' P3') || upperFile.includes(' P_3') || upperFile.includes(' PAPER 3') || upperFile.includes(' PAPER3') || upperFile.includes('_V3') || upperFile.includes(' V3') || upperFile.includes('-V3') || upperFile.includes('_V_3')) {
    paperNumber = 'P3';
  } else if (upperFile.includes('_P4') || upperFile.includes('-P4') || upperFile.includes(' P4') || upperFile.includes(' P_4') || upperFile.includes(' PAPER 4') || upperFile.includes(' PAPER4') || upperFile.includes('_V4') || upperFile.includes(' V4') || upperFile.includes('-V4') || upperFile.includes('_V_4')) {
    paperNumber = 'P4';
  } else {
    if (upperPath.includes('P1') || upperPath.includes('PAPER 1') || upperPath.includes('PAPER1') || upperPath.includes('_V1')) {
      paperNumber = 'P1';
    } else if (upperPath.includes('P2') || upperPath.includes('PAPER 2') || upperPath.includes('PAPER2') || upperPath.includes('_V2')) {
      paperNumber = 'P2';
    } else if (upperPath.includes('P3') || upperPath.includes('PAPER 3') || upperPath.includes('PAPER3') || upperPath.includes('_V3')) {
      paperNumber = 'P3';
    } else if (upperPath.includes('P4') || upperPath.includes('PAPER 4') || upperPath.includes('PAPER4') || upperPath.includes('_V4')) {
      paperNumber = 'P4';
    }
  }

  // 5. Type (Memo vs Question)
  let type: 'question' | 'memo' = 'question';
  if (
    upperFile.includes('MEMO') || 
    upperFile.includes('MEMORANDUM') || 
    upperFile.includes('_M.') || 
    upperFile.includes('-M.') || 
    upperFile.includes('_M_') || 
    upperFile.includes(' ANSWER') || 
    upperFile.includes('ANS ') ||
    normFile.includes(' ANT ') ||
    normFile.includes('ANTWOORD') ||
    upperPath.includes('MEMO') ||
    upperPath.includes('MEMORANDUM')
  ) {
    type = 'memo';
  }

  // 6. Language medium
  let language: 'English' | 'Afrikaans' = 'English';
  if (
    upperFile.includes('_AFR_') || 
    upperFile.includes('_AFRIKAANS') || 
    upperFile.includes('(AFRIKAANS)') || 
    upperFile.includes('_AFR.') || 
    upperFile.includes('_V1') || 
    upperFile.includes('_V2') || 
    upperFile.includes('_V3') || 
    upperFile.includes('WISKUNDE') ||
    normFile.includes('FISIESE WETENSKAPPE') ||
    normFile.includes('REKENINGKUNDE') ||
    normPath.includes('WISKUNDE') ||
    normPath.includes('AFRIKAANS')
  ) {
    language = 'Afrikaans';
  }

  // 7. Subject Resolution
  let subject = '';
  const folderSubject = parts[parts.length - 2]?.toUpperCase() || '';

  const hasHL = upperPath.includes('_HL') || upperPath.includes(' HL') || upperPath.includes('-HL') || upperPath.includes('HT') || upperPath.includes('HUISTAAL') || upperPath.includes('HOME LANGUAGE') || upperPath.includes('HOME_LANGUAGE') || upperFile.includes('_HL') || upperFile.includes(' HL') || upperFile.includes('-HL');
  const hasFAL = upperPath.includes('_FAL') || upperPath.includes(' FAL') || upperPath.includes('-FAL') || upperPath.includes('EAT') || upperPath.includes('FIRST ADDITIONAL') || upperPath.includes('FIRST_ADDITIONAL') || upperFile.includes('_FAL') || upperFile.includes(' FAL') || upperFile.includes('-FAL');
  const hasSAL = upperPath.includes('_SAL') || upperPath.includes(' SAL') || upperPath.includes('-SAL') || upperPath.includes('TAT') || upperPath.includes('SECOND ADDITIONAL') || upperPath.includes('SECOND_ADDITIONAL') || upperFile.includes('_SAL') || upperFile.includes(' SAL') || upperFile.includes('-SAL');

  if (folderSubject === 'MATHEMATICS') {
    subject = 'Mathematics';
  } else if (folderSubject === 'PHYSICAL SCIENCES' || folderSubject === 'PHYSICAL_SCIENCES') {
    subject = 'Physical Sciences';
  } else if (folderSubject === 'LIFE SCIENCES' || folderSubject === 'LIFE_SCIENCES') {
    subject = 'Life Sciences';
  } else if (folderSubject === 'MATHEMATICAL LITERACY' || folderSubject === 'MATHEMATICAL_LITERACY') {
    subject = 'Mathematical Literacy';
  } else if (folderSubject === 'ACCOUNTING') {
    subject = 'Accounting';
  } else if (folderSubject === 'BUSINESS STUDIES' || folderSubject === 'BUSINESS_STUDIES') {
    subject = 'Business Studies';
  } else if (folderSubject === 'ECONOMICS') {
    subject = 'Economics';
  } else if (folderSubject === 'GEOGRAPHY') {
    subject = 'Geography';
  } else if (folderSubject === 'HISTORY') {
    subject = 'History';
  } else if (folderSubject === 'TECHNICAL MATHEMATICS' || folderSubject === 'TECHNICAL_MATHEMATICS') {
    subject = 'Technical Mathematics';
  } else if (folderSubject === 'TECHNICAL SCIENCES' || folderSubject === 'TECHNICAL_SCIENCES') {
    subject = 'Technical Sciences';
  } else if (folderSubject === 'TOURISM') {
    subject = 'Tourism';
  } else if (folderSubject === 'CONSUMER STUDIES' || folderSubject === 'CONSUMER_STUDIES') {
    subject = 'Consumer Studies';
  } else if (folderSubject === 'HOSPITALITY STUDIES' || folderSubject === 'HOSPITALITY_STUDIES') {
    subject = 'Hospitality Studies';
  } else if (folderSubject === 'AGRICULTURAL SCIENCES' || folderSubject === 'AGRICULTURAL_SCIENCES') {
    subject = 'Agricultural Sciences';
  } else if (folderSubject === 'AGRICULTURAL TECHNOLOGY' || folderSubject === 'AGRICULTURAL_TECHNOLOGY') {
    subject = 'Agricultural Technology';
  } else if (folderSubject === 'AGRICULTURAL MANAGEMENT PRACTICES' || folderSubject === 'AGRICULTURAL_MANAGEMENT_PRACTICES') {
    subject = 'Agricultural Management Practices';
  } else if (folderSubject === 'COMPUTER APPLICATIONS TECHNOLOGY' || folderSubject === 'COMPUTER_APPLICATIONS_TECHNOLOGY' || folderSubject === 'CAT') {
    subject = 'Computer Applications Technology';
  } else if (folderSubject === 'INFORMATION TECHNOLOGY' || folderSubject === 'INFORMATION_TECHNOLOGY' || folderSubject === 'IT') {
    subject = 'Information Technology';
  } else if (folderSubject === 'CIVIL TECHNOLOGY' || folderSubject === 'CIVIL_TECHNOLOGY') {
    if (normPath.includes('CONSTRUCTION')) {
      subject = 'Civil Technology (Construction)';
    } else if (normPath.includes('WOODWORKING')) {
      subject = 'Civil Technology (Woodworking)';
    } else if (normPath.includes('CIVIL SERVICES') || normPath.includes('CIVIL_SERVICES')) {
      subject = 'Civil Technology (Civil Services)';
    } else {
      subject = 'Civil Technology';
    }
  } else if (folderSubject === 'ELECTRICAL TECHNOLOGY' || folderSubject === 'ELECTRICAL_TECHNOLOGY') {
    if (normPath.includes('POWER SYSTEMS') || normPath.includes('POWER_SYSTEMS')) {
      subject = 'Electrical Technology (Power Systems)';
    } else if (normPath.includes('ELECTRONICS')) {
      subject = 'Electrical Technology (Electronics)';
    } else if (normPath.includes('DIGITAL SYSTEMS') || normPath.includes('DIGITAL_SYSTEMS')) {
      subject = 'Electrical Technology (Digital Systems)';
    } else {
      subject = 'Electrical Technology';
    }
  } else if (folderSubject === 'MECHANICAL TECHNOLOGY' || folderSubject === 'MECHANICAL_TECHNOLOGY') {
    if (normPath.includes('AUTOMOTIVE')) {
      subject = 'Mechanical Technology (Automotive)';
    } else if (normPath.includes('FITTING') || normPath.includes('MACHINING')) {
      subject = 'Mechanical Technology (Fitting & Machining)';
    } else if (normPath.includes('WELDING') || normPath.includes('METALWORK')) {
      subject = 'Mechanical Technology (Welding & Metalwork)';
    } else {
      subject = 'Mechanical Technology';
    }
  } else if (folderSubject === 'DRAMATIC ARTS' || folderSubject === 'DRAMATIC_ARTS') {
    subject = 'Dramatic Arts';
  } else if (folderSubject === 'MUSIC') {
    subject = 'Music';
  } else if (folderSubject === 'VISUAL ARTS' || folderSubject === 'VISUAL_ARTS') {
    subject = 'Visual Arts';
  } else if (folderSubject === 'DANCE STUDIES' || folderSubject === 'DANCE_STUDIES') {
    subject = 'Dance Studies';
  } else if (folderSubject === 'ISIZULU') {
    subject = hasFAL ? 'IsiZulu First Additional Language' : hasSAL ? 'IsiZulu Second Additional Language' : 'IsiZulu Home Language';
  } else if (folderSubject === 'ISIXHOSA') {
    subject = hasFAL ? 'IsiXhosa First Additional Language' : hasSAL ? 'IsiXhosa Second Additional Language' : 'IsiXhosa Home Language';
  } else if (folderSubject === 'SISWATI') {
    subject = hasFAL ? 'SiSwati First Additional Language' : hasSAL ? 'SiSwati Second Additional Language' : 'SiSwati Home Language';
  } else if (folderSubject === 'TSHIVENDA') {
    subject = hasFAL ? 'Tshivenda First Additional Language' : hasSAL ? 'Tshivenda Second Additional Language' : 'Tshivenda Home Language';
  } else if (folderSubject === 'SEPEDI') {
    subject = hasFAL ? 'Sepedi First Additional Language' : hasSAL ? 'Sepedi Second Additional Language' : 'Sepedi Home Language';
  } else if (folderSubject === 'SESOTHO') {
    subject = hasFAL ? 'Sesotho First Additional Language' : hasSAL ? 'Sesotho Second Additional Language' : 'Sesotho Home Language';
  } else if (folderSubject === 'XITSONGA') {
    subject = hasFAL ? 'Xitsonga First Additional Language' : hasSAL ? 'Xitsonga Second Additional Language' : 'Xitsonga Home Language';
  } else if (folderSubject === 'SETSWANA') {
    subject = hasFAL ? 'Setswana First Additional Language' : hasSAL ? 'Setswana Second Additional Language' : 'Setswana Home Language';
  } else if (folderSubject === 'ISINDEBELE') {
    subject = hasFAL ? 'IsiNdebele First Additional Language' : hasSAL ? 'IsiNdebele Second Additional Language' : 'IsiNdebele Home Language';
  } else if (folderSubject === 'AFRIKAANS') {
    subject = hasFAL ? 'Afrikaans First Additional Language' : hasSAL ? 'Afrikaans Second Additional Language' : 'Afrikaans Huistaal';
  } else if (folderSubject === 'ENGLISH HOME LANGUAGE' || folderSubject === 'ENGLISH' || folderSubject === 'ENGLISH_HOME_LANGUAGE') {
    if (normFile.includes('CONSTRUCTION')) {
      subject = 'Civil Technology (Construction)';
    } else if (normFile.includes('WOODWORKING')) {
      subject = 'Civil Technology (Woodworking)';
    } else if (normFile.includes('CIVIL SERVICES') || normFile.includes('CIVIL_SERVICES')) {
      subject = 'Civil Technology (Civil Services)';
    } else if (normFile.includes('POWER SYSTEMS') || normFile.includes('POWER_SYSTEMS')) {
      subject = 'Electrical Technology (Power Systems)';
    } else if (normFile.includes('ELECTRONICS')) {
      subject = 'Electrical Technology (Electronics)';
    } else if (normFile.includes('DIGITAL SYSTEMS') || normFile.includes('DIGITAL_SYSTEMS')) {
      subject = 'Electrical Technology (Digital Systems)';
    } else if (normFile.includes('AUTOMOTIVE')) {
      subject = 'Mechanical Technology (Automotive)';
    } else if (normFile.includes('FITTING') || normFile.includes('MACHINING')) {
      subject = 'Mechanical Technology (Fitting & Machining)';
    } else if (normFile.includes('WELDING') || normFile.includes('METALWORK')) {
      subject = 'Mechanical Technology (Welding & Metalwork)';
    } else {
      subject = hasFAL ? 'English First Additional Language' : 'English Home Language';
    }
  } else {
    if (normFile.includes('MATHEMATICAL LITERACY') || normFile.includes('MATHS LIT') || normFile.includes('MATH LIT') || normFile.includes('WISKUNDE GELETTERDHEID') || normFile.includes('WISK GELETTERDHEID')) {
      subject = 'Mathematical Literacy';
    } else if (normFile.includes('TECHNICAL MATHEMATICS') || normFile.includes('TECH MATH')) {
      subject = 'Technical Mathematics';
    } else if (normFile.includes('MATHEMATICS') || normFile.includes('MATHS') || normFile.includes('MATH') || normFile.includes('WISKUNDE') || normFile.includes('WISK')) {
      subject = 'Mathematics';
    } else if (normFile.includes('PHYSICAL SCIENCES') || normFile.includes('PHYSICAL SCIENCE') || normFile.includes('FISIESE WETENSKAPPE') || normFile.includes('PHYSICS') || normFile.includes('PHSC')) {
      subject = 'Physical Sciences';
    } else if (normFile.includes('TECHNICAL SCIENCES') || normFile.includes('TEGNIESE WETENSKAPPE')) {
      subject = 'Technical Sciences';
    } else if (normFile.includes('LIFE SCIENCES') || normFile.includes('LIFE SCIENCE') || normFile.includes('LEWENSWETENSKAPPE') || normFile.includes('LFSC') || normFile.includes('BIOLOGY')) {
      subject = 'Life Sciences';
    } else if (normFile.includes('ACCOUNTING') || normFile.includes('REKENINGKUNDE') || normFile.includes('ACCN')) {
      subject = 'Accounting';
    } else if (normFile.includes('BUSINESS STUDIES') || normFile.includes('BESIGHEIDSTUDIES') || normFile.includes('BSTD')) {
      subject = 'Business Studies';
    } else if (normFile.includes('ECONOMICS') || normFile.includes('EKONOMIE') || normFile.includes('ECON')) {
      subject = 'Economics';
    } else if (normFile.includes('GEOGRAPHY') || normFile.includes('GEOGRAFIE') || normFile.includes('GEOG')) {
      subject = 'Geography';
    } else if (normFile.includes('HISTORY') || normFile.includes('GESKIEDENIS') || normFile.includes('HIST')) {
      subject = 'History';
    } else if (normFile.includes('AGRICULTURAL SCIENCES') || normFile.includes('AGRICULTURAL SCIENCE') || normFile.includes('LANDBOUWETENSKAPPE') || normFile.includes('AGRI_SCI')) {
      subject = 'Agricultural Sciences';
    } else if (normFile.includes('AGRICULTURAL TECHNOLOGY') || normFile.includes('LANDBOU-TEGNOLOGIE')) {
      subject = 'Agricultural Technology';
    } else if (normFile.includes('AGRICULTURAL MANAGEMENT') || normFile.includes('LANDBOUBESTUURSPRAKTYKE')) {
      subject = 'Agricultural Management Practices';
    } else if (normFile.includes('CONSTRUCTION')) {
      subject = 'Civil Technology (Construction)';
    } else if (normFile.includes('WOODWORKING')) {
      subject = 'Civil Technology (Woodworking)';
    } else if (normFile.includes('CIVIL SERVICES') || normFile.includes('CIVIL_SERVICES')) {
      subject = 'Civil Technology (Civil Services)';
    } else if (normFile.includes('POWER SYSTEMS') || normFile.includes('POWER_SYSTEMS')) {
      subject = 'Electrical Technology (Power Systems)';
    } else if (normFile.includes('ELECTRONICS')) {
      subject = 'Electrical Technology (Electronics)';
    } else if (normFile.includes('DIGITAL SYSTEMS') || normFile.includes('DIGITAL_SYSTEMS')) {
      subject = 'Electrical Technology (Digital Systems)';
    } else if (normFile.includes('AUTOMOTIVE')) {
      subject = 'Mechanical Technology (Automotive)';
    } else if (normFile.includes('FITTING') || normFile.includes('MACHINING')) {
      subject = 'Mechanical Technology (Fitting & Machining)';
    } else if (normFile.includes('WELDING') || normFile.includes('METALWORK')) {
      subject = 'Mechanical Technology (Welding & Metalwork)';
    } else if (normFile.includes('COMPUTER APPLICATIONS') || normFile.includes(' CAT ') || normFile.includes('_CAT_') || normFile.includes('CAT_')) {
      subject = 'Computer Applications Technology';
    } else if (normFile.includes('INFORMATION TECHNOLOGY') || normFile.includes(' IT ') || normFile.includes('_IT_') || normFile.includes('IT_')) {
      subject = 'Information Technology';
    } else if (normFile.includes('TOURISM') || normFile.includes('TOERISME')) {
      subject = 'Tourism';
    } else if (normFile.includes('CONSUMER STUDIES') || normFile.includes('VERBRUIKERSTUDIES')) {
      subject = 'Consumer Studies';
    } else if (normFile.includes('HOSPITALITY STUDIES') || normFile.includes('GASVRYHEIDSTUDIES')) {
      subject = 'Hospitality Studies';
    } else if (normFile.includes('DRAMATIC ARTS') || normFile.includes('DRAMATIESE KUNS')) {
      subject = 'Dramatic Arts';
    } else if (normFile.includes('MUSIC ') || normFile.includes('MUSIC_') || normFile.includes('MUSIEK')) {
      subject = 'Music';
    } else if (normFile.includes('VISUAL ARTS') || normFile.includes('VISUELE KUNS')) {
      subject = 'Visual Arts';
    } else if (normFile.includes('DANCE STUDIES') || normFile.includes('DANSSTUDIES')) {
      subject = 'Dance Studies';
    } else if (normFile.includes('ZULU') || normFile.includes('ISIZULU')) {
      subject = hasFAL ? 'IsiZulu First Additional Language' : hasSAL ? 'IsiZulu Second Additional Language' : 'IsiZulu Home Language';
    } else if (normFile.includes('XHOSA') || normFile.includes('ISIXHOSA')) {
      subject = hasFAL ? 'IsiXhosa First Additional Language' : hasSAL ? 'IsiXhosa Second Additional Language' : 'IsiXhosa Home Language';
    } else if (normFile.includes('SISWATI') || normFile.includes('SWATI')) {
      subject = hasFAL ? 'SiSwati First Additional Language' : hasSAL ? 'SiSwati Second Additional Language' : 'SiSwati Home Language';
    } else if (normFile.includes('TSHIVENDA') || normFile.includes('VENDA')) {
      subject = hasFAL ? 'Tshivenda First Additional Language' : hasSAL ? 'Tshivenda Second Additional Language' : 'Tshivenda Home Language';
    } else if (normFile.includes('SEPEDI')) {
      subject = hasFAL ? 'Sepedi First Additional Language' : hasSAL ? 'Sepedi Second Additional Language' : 'Sepedi Home Language';
    } else if (normFile.includes('SESOTHO')) {
      subject = hasFAL ? 'Sesotho First Additional Language' : hasSAL ? 'Sesotho Second Additional Language' : 'Sesotho Home Language';
    } else if (normFile.includes('XITSONGA') || normFile.includes('TSONGA')) {
      subject = hasFAL ? 'Xitsonga First Additional Language' : hasSAL ? 'Xitsonga Second Additional Language' : 'Xitsonga Home Language';
    } else if (normFile.includes('SETSWANA') || normFile.includes('TSWANA')) {
      subject = hasFAL ? 'Setswana First Additional Language' : hasSAL ? 'Setswana Second Additional Language' : 'Setswana Home Language';
    } else if (normFile.includes('NDEBELE') || normFile.includes('ISINDEBELE')) {
      subject = hasFAL ? 'IsiNdebele First Additional Language' : hasSAL ? 'IsiNdebele Second Additional Language' : 'IsiNdebele Home Language';
    } else if (normFile.includes('AFRIKAANS') || normFile.includes('WISKUNDE') || normFile.includes('V1') || normFile.includes('V2') || normFile.includes('V3')) {
      subject = hasFAL ? 'Afrikaans First Additional Language' : hasSAL ? 'Afrikaans Second Additional Language' : 'Afrikaans Huistaal';
    } else if (normFile.includes('ENGLISH') || normFile.includes('ENG ')) {
      subject = hasFAL ? 'English First Additional Language' : 'English Home Language';
    } else {
      if (folderSubject && folderSubject !== 'OTHER') {
        subject = folderSubject.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      } else {
        if (upperFile.includes('AFRIKAANS')) {
          subject = hasFAL ? 'Afrikaans First Additional Language' : 'Afrikaans Huistaal';
        } else {
          subject = 'English First Additional Language';
        }
      }
    }
  }

  // 8. Generate beautiful title
  let suffix = '';
  if (type === 'memo') suffix = ' Memo';
  
  const cleanSubject = subject.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const title = `${cleanSubject} Grade ${grade} ${paperNumber}${suffix} (${year})`;

  // Session detection
  let session = 'Various';
  const upperCombinedForSession = (fullPath + '/' + fileName).toUpperCase();
  if (
    upperCombinedForSession.includes('MAYJUNE') || 
    upperCombinedForSession.includes('MAY_JUNE') || 
    upperCombinedForSession.includes('TERM2') || 
    upperCombinedForSession.includes('TERM 2') || 
    upperCombinedForSession.includes('MAY JUNE') || 
    upperCombinedForSession.includes('JUNE') || 
    upperCombinedForSession.includes(' JUN ') || 
    upperCombinedForSession.includes('_JUN_')
  ) {
    session = 'Term2_MayJune';
  } else if (
    upperCombinedForSession.includes('TRIAL') || 
    upperCombinedForSession.includes('PREP') || 
    upperCombinedForSession.includes('TERM3') || 
    upperCombinedForSession.includes('TERM 3') || 
    upperCombinedForSession.includes('PRELIMINARY') || 
    upperCombinedForSession.includes('PRELIM') || 
    upperCombinedForSession.includes('SEP') || 
    upperCombinedForSession.includes('SEPTEMBER')
  ) {
    session = 'Term3_Trial';
  } else if (
    upperCombinedForSession.includes('NOVEMBER') || 
    upperCombinedForSession.includes('NOV_') || 
    upperCombinedForSession.includes('NOV ') || 
    upperCombinedForSession.includes('_NOV_') || 
    upperCombinedForSession.includes('TERM4') || 
    upperCombinedForSession.includes('TERM 4')
  ) {
    session = 'Term4_November';
  }

  // Province detection
  let province = 'National';
  const upperCombined = (fullPath + '/' + fileName).toUpperCase();
  if (upperCombined.includes('EASTERN CAPE') || upperCombined.includes('EASTERNCAPE') || upperCombined.includes('EASTERN_CAPE') || upperCombined.includes(' EC ') || upperCombined.includes('_EC_') || upperCombined.includes('-EC-')) {
    province = 'Eastern Cape';
  } else if (upperCombined.includes('FREE STATE') || upperCombined.includes('FREESTATE') || upperCombined.includes('FREE_STATE') || upperCombined.includes(' FS ') || upperCombined.includes('_FS_') || upperCombined.includes('-FS-') || upperCombined.includes('VRYSTAAT')) {
    province = 'Free State';
  } else if (upperCombined.includes('GAUTENG') || upperCombined.includes(' GP ') || upperCombined.includes('_GP_') || upperCombined.includes('-GP-')) {
    province = 'Gauteng';
  } else if (upperCombined.includes('KWAZULU') || upperCombined.includes('KZN') || upperCombined.includes('KWA_ZULU') || upperCombined.includes('KWAZULU-NATAL')) {
    province = 'KwaZulu-Natal';
  } else if (upperCombined.includes('LIMPOPO') || upperCombined.includes(' LP ') || upperCombined.includes('_LP_') || upperCombined.includes('-LP-')) {
    province = 'Limpopo';
  } else if (upperCombined.includes('MPUMALANGA') || upperCombined.includes(' MP ') || upperCombined.includes('_MP_') || upperCombined.includes('-MP-')) {
    province = 'Mpumalanga';
  } else if (upperCombined.includes('NORTHERN CAPE') || upperCombined.includes('NORTHERNCAPE') || upperCombined.includes('NORTHERN_CAPE') || upperCombined.includes(' NC ') || upperCombined.includes('_NC_') || upperCombined.includes('-NC-')) {
    province = 'Northern Cape';
  } else if (upperCombined.includes('NORTH WEST') || upperCombined.includes('NORTHWEST') || upperCombined.includes('NORTH_WEST') || upperCombined.includes(' NW ') || upperCombined.includes('_NW_') || upperCombined.includes('-NW-')) {
    province = 'North West';
  } else if (upperCombined.includes('WESTERN CAPE') || upperCombined.includes('WESTERNCAPE') || upperCombined.includes('WESTERN_CAPE') || upperCombined.includes(' WC ') || upperCombined.includes('_WC_') || upperCombined.includes('-WC-')) {
    province = 'Western Cape';
  }
  
  return {
    title,
    subject,
    grade,
    year,
    curriculum,
    paperNumber,
    type,
    language,
    topics: [],
    session,
    province
  };
};

export function PastPapersPage() {
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    let subjectParam = params.get('subject') || 'All';
    if (subjectParam !== 'All') {
      const matched = SUBJECT_OPTIONS.find(s => s.toLowerCase() === subjectParam.toLowerCase());
      if (matched) {
        subjectParam = matched;
      } else {
        // Fallbacks for common mappings
        if (subjectParam.toLowerCase().includes('english')) subjectParam = 'English Home Language';
        else if (subjectParam.toLowerCase().includes('afrikaans')) subjectParam = 'Afrikaans Huistaal';
        else if (subjectParam.toLowerCase().includes('it') || subjectParam.toLowerCase().includes('cat')) subjectParam = 'All';
      }
    }
    return {
      grade: params.get('grade') || 'All',
      subject: subjectParam,
      year: params.get('year') || 'All',
      session: 'All',
      type: 'All',
      language: 'All',
      search: params.get('search') || '',
    };
  });

  const { papers: rawPapers, loading, error, refetch: refresh } = usePastPapers(filters);
  const incrementDownloadCount = async (id: string) => {
    // optional stub
  };

  const papers: PastPaper[] = (() => {
    const list = rawPapers.flatMap(group => {
      const p: PastPaper[] = [];
      if (group.questionPaper) {
        p.push({
          id: group.questionPaper.id,
          title: group.questionPaper.fileName,
          subject: group.questionPaper.subject,
          grade: parseInt(group.questionPaper.grade) || 12,
          year: parseInt(group.questionPaper.year) || new Date().getFullYear(),
          curriculum: group.questionPaper.curriculum as any,
          paperNumber: group.questionPaper.paper as any,
          type: 'question',
          language: group.questionPaper.language as any,
          session: group.questionPaper.session as any,
          province: group.questionPaper.province,
          fileUrl: group.questionPaper.downloadUrl,
          downloadCount: 0,
        });
      }
      if (group.memo) {
        p.push({
          id: group.memo.id,
          title: group.memo.fileName,
          subject: group.memo.subject,
          grade: parseInt(group.memo.grade) || 12,
          year: parseInt(group.memo.year) || new Date().getFullYear(),
          curriculum: group.memo.curriculum as any,
          paperNumber: group.memo.paper as any,
          type: 'memo',
          language: group.memo.language as any,
          session: group.memo.session as any,
          province: group.memo.province,
          fileUrl: group.memo.downloadUrl,
          downloadCount: 0,
        });
      }
      return p;
    });

    const seenIds = new Set<string>();
    return list.filter(item => {
      if (!item.id || seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
  })();
  const [viewPaper, setViewPaper] = useState<PastPaper | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [activeDocType, setActiveDocType] = useState<'question' | 'memo'>('question');
  const [questionLoading, setQuestionLoading] = useState(true);
  const [memoLoading, setMemoLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [dismissedCountdown, setDismissedCountdown] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (viewPaper) {
      setActiveDocType(viewPaper.type === 'memo' ? 'memo' : 'question');
      setQuestionLoading(true);
      setMemoLoading(true);

      timer = setTimeout(() => {
        if (user) {
          fetch('/api/activity/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid, action: 'view_paper' })
          }).catch(console.error);
        }
      }, 30000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [viewPaper, user]);

  const BOOTSTRAP_ADMIN_EMAILS = ['techinfinite.banking@gmail.com', 'contact@salainnovationlabs.com'];
  const isAdmin = !!(user && user.email && BOOTSTRAP_ADMIN_EMAILS.includes(user.email));

  // Storage Synchronization Utility states
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [syncStep, setSyncStep] = useState<string>('');
  const [syncCount, setSyncCount] = useState({ scanned: 0, checked: 0, added: 0, totalToSync: 0 });
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [syncLogs]);

  const handleSyncStorage = async () => {
    setSyncStatus('running');
    setSyncLogs([]);
    setSyncCount({ scanned: 0, checked: 0, added: 0, totalToSync: 0 });
    
    const addLog = (msg: string) => {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      addLog("🚀 Starting live storage scan and comparison utility...");
      setSyncStep("Scanning Database...");
      addLog("Querying Firestore database for existing indices...");
      
      const firestoreSnap = await getDocs(collection(db, 'past-papers'));
      const dbUrlSet = new Set<string>();
      const dbPathSet = new Set<string>();
      
      firestoreSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.fileUrl) dbUrlSet.add(d.fileUrl);
        if (d.storagePath) dbPathSet.add(d.storagePath);
      });
      
      addLog(`Database query complete. Found ${firestoreSnap.size} indexed records in Firestore.`);
      setSyncCount(prev => ({ ...prev, checked: firestoreSnap.size }));
      
      setSyncStep("Scanning Storage Bucket...");
      addLog("Recursively scanning Firebase Storage folder variants...");
      
      const discoveredFiles: any[] = [];
      const crawledPaths = new Set<string>();
      
      const crawl = async (dirRef: any) => {
        const pathStr = dirRef.fullPath || dirRef.path || '';
        if (crawledPaths.has(pathStr)) return;
        crawledPaths.add(pathStr);
        
        try {
          const result = await listAll(dirRef);
          for (const item of result.items) {
            discoveredFiles.push(item);
            setSyncCount(prev => ({ ...prev, scanned: discoveredFiles.length }));
            if (discoveredFiles.length % 50 === 0) {
              addLog(`Discovered ${discoveredFiles.length} file assets in Storage...`);
            }
          }
          if (result.prefixes.length > 0) {
            await Promise.all(result.prefixes.map(prefix => crawl(prefix)));
          }
        } catch (crawlErr: any) {
          addLog(`⚠️ Storage list warning on layout path '${pathStr}': ${crawlErr.message}`);
        }
      };

      const crawlWithStorage = async (baseStorage: any, storageName: string) => {
        // Try automatic folder discovery by listing root prefixes
        let rootFolders: any[] = [];
        try {
          const rootRef = ref(baseStorage, '/');
          const rootResult = await listAll(rootRef);
          rootFolders = rootResult.prefixes;
        } catch (rootErr: any) {
          addLog(`Note: Storage bucket root non-traversable directly on ${storageName}. Falling back to explicit casing lists.`);
        }

        const activeScannedFolders = new Set<string>();

        if (rootFolders.length > 0) {
          addLog(`Located ${rootFolders.length} system directories on bucket root (${storageName}):`);
          for (const f of rootFolders) {
            addLog(` - Crawling folder: '${f.name}'`);
            activeScannedFolders.add(f.name);
            await crawl(f);
          }
        }

        // Hard fallback explicit directories to perfectly secure 'Past-papers', 'past-papers', etc.
        const explicitFallbacks = ['Past-papers', 'past-papers', 'Past-Papers', 'past-paper', 'Past-paper', 'NSC', 'past-papers/past-papers'];
        for (const fallName of explicitFallbacks) {
          if (!activeScannedFolders.has(fallName)) {
            addLog(`Crawling explicit fallback folder path: '${fallName}' (${storageName})...`);
            try {
              const explicitRef = ref(baseStorage, fallName);
              await crawl(explicitRef);
              activeScannedFolders.add(fallName);
            } catch (err) {
              // Ignored if folder is non-existent
            }
          }
        }
      };

      await crawlWithStorage(storage, "picshare-vdg8u bucket");
      await crawlWithStorage(defaultStorage, "default bucket");
      
      addLog(`Scan finished. Discovered ${discoveredFiles.length} physical file assets in Firebase Storage.`);
      
      setSyncStep("Comparing indexes... Reconciling against Firestore.");
      const missingFiles = discoveredFiles.filter(item => {
        return !dbPathSet.has(item.fullPath);
      });
      
      addLog(`Comparison complete. ${discoveredFiles.length - missingFiles.length} files are already indexed. ${missingFiles.length} missing files require indexing.`);
      
      if (missingFiles.length === 0) {
        addLog("✅ Database and Storage are completely in sync! No files to import.");
        setSyncStatus('completed');
        setSyncStep("Complete");
        refresh();
        return;
      }
      
      setSyncStep(`Indexing ${missingFiles.length} missing papers...`);
      setSyncCount(prev => ({ ...prev, totalToSync: missingFiles.length }));
      
      const BATCH_SIZE = 24;
      let addedCount = 0;
      
      for (let i = 0; i < missingFiles.length; i += BATCH_SIZE) {
        const chunk = missingFiles.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        let batchHasDocs = false;

        const itemsChunk = await Promise.all(chunk.map(async (f: any) => ({
          path: f.fullPath,
          url: await getDownloadURL(f).catch(() => "")
        })));
        let parsedChunk: any[] = [];
        try {
          addLog(`Requesting AI metadata extraction for batch of ${itemsChunk.length} files...`);
          const res = await fetch('/api/ai/parse-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: itemsChunk })
          });
          if (res.ok) {
            parsedChunk = await res.json();
          } else {
            addLog(`AI parsing failed, falling back to local heuristic parsing...`);
          }
        } catch (e) {
          addLog(`AI parse error: ${e}. Falling back to local...`);
        }

        await Promise.all(chunk.map(async (fileRef: any, index: number) => {
          try {
            const downloadUrl = await getDownloadURL(fileRef);
            const aiMeta = parsedChunk[index];
            const localMeta = parseStorageFile(fileRef.fullPath, fileRef.name);
            const meta = (aiMeta && aiMeta.subject && aiMeta.title) ? aiMeta : localMeta;
            
            const docObj = {
              title: meta.title || localMeta.title,
              subject: meta.subject || localMeta.subject,
              grade: meta.grade || localMeta.grade,
              year: meta.year || localMeta.year,
              curriculum: meta.curriculum || localMeta.curriculum,
              paperNumber: meta.paperNumber || localMeta.paperNumber,
              type: meta.type || localMeta.type,
              language: meta.language || localMeta.language,
              fileUrl: downloadUrl,
              storagePath: fileRef.fullPath,
              fileSize: 0,
              downloadCount: 0,
              topics: meta.topics,
              isVerified: true,
              uploadedBy: 'system-sync',
              session: meta.session || 'Various',
              province: meta.province || 'National',
              createdAt: serverTimestamp()
            };
            
            const newDocRef = doc(collection(db, 'past-papers'));
            batch.set(newDocRef, docObj);
            batchHasDocs = true;
            addedCount++;
          } catch (e: any) {
            addLog(`⚠️ Indexing failed for ${fileRef.name}: ${e.message}`);
          }
        }));

        if (batchHasDocs) {
          await batch.commit();
          setSyncCount(prev => ({ ...prev, added: addedCount }));
          addLog(`Successful indexed progress batch (${chunk.length} items synced. Total: ${addedCount}/${missingFiles.length})`);
        }
        
        await new Promise(r => setTimeout(r, 100));
      }
      
      addLog(`✨ Synchronisation complete! Successfully indexed ${addedCount} past papers on your website.`);
      setSyncStatus('completed');
      setSyncStep("Complete");
      refresh();
    } catch (err: any) {
      console.error("Sync Error:", err);
      addLog(`❌ Sychronisation failed with unexpected error: ${err.message}`);
      setSyncStatus('error');
    }
  };

  // Focus lock helper for the PDF viewer modal
  useEffect(() => {
    if (viewPaper) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewPaper]);

  // Approach B: Auto-scan on Page Load (Client-Side)
  // Automatically sense new documents added to Storage and sync them to Firestore
  useEffect(() => {
    // Only auto-sync once per session to prevent repeated heavy queries
    if (!sessionStorage.getItem('auto_synced_storage')) {
      sessionStorage.setItem('auto_synced_storage', 'true');
      console.log("[Auto-Sync] Live sensing new documents from Storage bucket in background...");
      // Wrap in timeout to prioritize main rendering first
      setTimeout(() => {
        handleSyncStorage();
      }, 500);
    }
  }, []);


  const handleDownload = async (paper: PastPaper) => {
    setDownloadingId(paper.id);
    try {
      await incrementDownloadCount(paper.id);
      
      const response = await fetch(paper.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = paper.fileUrl.split('.').pop()?.split('?')[0] || 'pdf';
      link.download = `${paper.title || 'PastPaper'}.${extension}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.warn("Direct fetch CORS block fallback. Triggering anchor click.", err);
      const link = document.createElement('a');
      link.href = paper.fileUrl;
      link.target = '_blank';
      link.download = paper.title || 'PastPaper';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      grade: 'All',
      subject: 'All',
      year: 'All',
      session: 'All',
      type: 'All',
      language: 'All',
      search: '',
    });
  };

  const getFullscreenCompanion = (): PastPaper | null => {
    if (!viewPaper) return null;
    const cleanProvince = (prov?: string) => (prov || 'National').trim().toLowerCase();
    
    let comp = papers.find(p => 
      p.id !== viewPaper.id &&
      p.type !== viewPaper.type &&
      p.grade === viewPaper.grade &&
      p.year === viewPaper.year &&
      p.subject?.toLowerCase() === viewPaper.subject?.toLowerCase() &&
      p.paperNumber?.toLowerCase() === viewPaper.paperNumber?.toLowerCase() &&
      p.language === viewPaper.language &&
      p.session === viewPaper.session &&
      cleanProvince(p.province) === cleanProvince(viewPaper.province)
    );
    if (!comp) {
      comp = papers.find(p => 
        p.id !== viewPaper.id &&
        p.type !== viewPaper.type &&
        p.grade === viewPaper.grade &&
        p.year === viewPaper.year &&
        p.subject?.toLowerCase() === viewPaper.subject?.toLowerCase() &&
        p.paperNumber?.toLowerCase() === viewPaper.paperNumber?.toLowerCase() &&
        p.language === viewPaper.language &&
        cleanProvince(p.province) === cleanProvince(viewPaper.province)
      );
    }
    return comp || null;
  };

  const fullscreenCompanion = getFullscreenCompanion();

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => key !== 'search' && value !== 'All').length;

  return (
    <div className="min-h-screen bg-lux-bg flex flex-col font-sans">
      <Navbar />

      {/* Slim Header Section */}
      <div className="relative pt-32 pb-12 overflow-hidden bg-lux-bg">
        <div className="absolute top-0 right-0 w-[60%] h-[70%] -z-0" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(38, 122, 74, 0.08) 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] -z-0" style={{ background: 'radial-gradient(circle at 20% 80%, rgba(10, 38, 22, 0.1) 0%, transparent 60%)' }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="w-12 h-[2px] bg-lux-green-500 rounded-full"></span>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-lux-green-500">Academic Library</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-lux-text tracking-tight mb-4">
              The Past Papers Vault
            </h1>
            <p className="text-base md:text-lg text-lux-text/80 font-light tracking-wide leading-relaxed">
              A meticulously curated archive of official NSC examination papers, memoranda, and study resources.
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 text-[11px] uppercase font-bold tracking-widest text-lux-text bg-lux-surface/60 border border-white/20 dark:border-white/10 px-5 py-3 rounded-2xl shadow-xl self-start md:self-auto backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5 transition-all">
            <div className="bg-lux-green-500/10 p-1.5 rounded-lg">
              <BookOpen size={16} className="text-lux-green-500" />
            </div>
            <span className="text-lux-text/90">
              {loading ? 'Analyzing Archive...' : `${papers.length} Verified Resources`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-8 relative z-10">
        
        
        {filters.subject !== 'All' && !dismissedCountdown && (
           <ExamCountdownWidget 
              subject={filters.subject} 
              onDismiss={() => setDismissedCountdown(true)} 
           />
        )}

        {/* Floating Glass Filtration Console */}
        <div className="bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/20 rounded-2xl p-2 md:p-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.15)] flex flex-col gap-2 relative overflow-hidden backdrop-blur-[60px] backdrop-saturate-[2.0] sticky top-24 z-50 transition-all duration-300">

          {/* Top Row: Compact Search & Active Stats/Actions */}
          <div className={`flex flex-col md:flex-row md:items-center justify-between gap-2 relative z-10 ${showFilters ? 'pb-2 border-b border-white/10 dark:border-white/5' : ''}`}>
            {/* Left: Compact Title & Input */}
            <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:items-center">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center sm:justify-start gap-1.5 text-lux-text bg-lux-surface/40 hover:bg-lux-surface/60 backdrop-blur-md px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl cursor-pointer transition-all shadow-sm border border-white/20 dark:border-white/10 shrink-0"
                title={showFilters ? "Hide Filters" : "Show Filters"}
              >
                <SlidersHorizontal size={14} className={showFilters ? "text-lux-green-500" : "text-lux-text/80"} />
                <span className="text-[10px] font-extrabold uppercase tracking-widest">{showFilters ? "Hide Filters" : "Filters"}</span>
              </button>
              
              <div className="relative group flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-lux-text/60 group-focus-within:text-lux-green-500 transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Search by topic, keyword, or year..."
                  className="w-full bg-lux-surface/40 backdrop-blur-md border border-white/20 dark:border-white/10 focus:border-lux-green-500 focus:bg-lux-surface/60 focus:ring-1 focus:ring-lux-green-500/30 rounded-xl py-1.5 pl-8 pr-3 text-[10px] uppercase tracking-widest font-bold outline-none transition-all placeholder:text-lux-text/50 placeholder:normal-case placeholder:tracking-normal placeholder:font-medium text-lux-text shadow-inner"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>

            {/* Right: DB Index Count & Reset */}
            <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
              <div className="text-left md:text-right hidden md:block">
                <span className="text-[9px] font-black uppercase tracking-widest text-lux-text/60 block mb-0.5">Total Volume</span>
                <span className="flex items-center md:justify-end gap-1.5 text-[11px] font-bold text-lux-text bg-lux-surface/40 backdrop-blur-md border border-white/10 dark:border-white/5 px-2.5 py-1 rounded-lg shadow-inner">
                  <span className="h-1.5 w-1.5 rounded-full bg-lux-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  {loading ? 'Analyzing...' : `${papers.length} files`}
                </span>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-xl text-[10px] font-bold text-red-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm backdrop-blur-md"
                >
                  <RefreshCw size={11} className="animate-spin" style={{ animationDuration: '4s' }} />
                  Clear ({activeFiltersCount})
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-300 flex flex-col gap-2 relative z-10">
              {/* Grid Selection Filters: Grade, Subject, Term, Year */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {/* Grade Level */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-lux-text/70 block px-1">Grade Level</label>
                  <div className="relative">
                    <SlidersHorizontal className="absolute left-2 top-1/2 -translate-y-1/2 text-lux-text/60 pointer-events-none" size={12} />
                    <select
                      value={filters.grade}
                      onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                      className="w-full bg-lux-surface/40 backdrop-blur-md border border-white/20 dark:border-white/10 focus:border-lux-green-500 focus:bg-lux-surface/60 rounded-lg py-1.5 pl-7 pr-6 text-[10px] uppercase font-bold tracking-widest text-lux-text outline-none cursor-pointer appearance-none transition-all shadow-inner"
                    >
                      <option value="All">Grade 12 Only</option>
                      {GRADE_OPTIONS.map(g => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-lux-text/50 text-[9px]">▼</div>
                  </div>
                </div>

                {/* Subject Area */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-lux-text/70 block px-1">Subject Area</label>
                  <div className="relative">
                    <BookOpen className="absolute left-2 top-1/2 -translate-y-1/2 text-lux-text/60 pointer-events-none" size={12} />
                    <select
                      value={filters.subject}
                      onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full bg-lux-surface/40 backdrop-blur-md border border-white/20 dark:border-white/10 focus:border-lux-green-500 focus:bg-lux-surface/60 rounded-lg py-1.5 pl-7 pr-6 text-[10px] uppercase font-bold tracking-widest text-lux-text outline-none cursor-pointer appearance-none transition-all shadow-inner"
                    >
                      <option value="All">All Subjects</option>
                      {SUBJECT_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-lux-text/50 text-[9px]">▼</div>
                  </div>
                </div>

                {/* Term/Session */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-lux-text/70 block px-1">Exam Session</label>
                  <div className="relative">
                    <ClipboardList className="absolute left-2 top-1/2 -translate-y-1/2 text-lux-text/60 pointer-events-none" size={12} />
                    <select
                      value={filters.session}
                      onChange={(e) => setFilters(prev => ({ ...prev, session: e.target.value }))}
                      className="w-full bg-lux-surface/40 backdrop-blur-md border border-white/20 dark:border-white/10 focus:border-lux-green-500 focus:bg-lux-surface/60 rounded-lg py-1.5 pl-7 pr-6 text-[10px] uppercase font-bold tracking-widest text-lux-text outline-none cursor-pointer appearance-none transition-all shadow-inner"
                    >
                      <option value="All">All Sessions</option>
                      {SESSION_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-lux-text/50 text-[9px]">▼</div>
                  </div>
                </div>

                {/* Publication Year */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-lux-text/70 block px-1">Publication Year</label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 text-lux-text/60 pointer-events-none" size={12} />
                    <select
                      value={filters.year}
                      onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full bg-lux-surface/40 backdrop-blur-md border border-white/20 dark:border-white/10 focus:border-lux-green-500 focus:bg-lux-surface/60 rounded-lg py-1.5 pl-7 pr-6 text-[10px] uppercase font-bold tracking-widest text-lux-text outline-none cursor-pointer appearance-none transition-all shadow-inner"
                    >
                      <option value="All">All Years</option>
                      {YEAR_OPTIONS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-lux-text/50 text-[9px]">▼</div>
                  </div>
                </div>
              </div>

              {/* Integrated Document Categories & Quick Subject Filters */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 pt-2 border-t border-white/10 dark:border-white/5">
                {/* Category selection */}
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-lux-text/70 shrink-0">Doc Category</span>
                  <div className="bg-lux-surface/30 backdrop-blur-md p-1 rounded-xl flex items-center border border-white/10 shadow-inner">
                    {[
                      { val: 'All', label: 'All Docs' },
                      { val: 'question', label: 'Papers' },
                      { val: 'memo', label: 'Memos' },
                    ].map(t => (
                      <button
                        key={t.val}
                        type="button"
                        onClick={() => setFilters(prev => ({ ...prev, type: t.val }))}
                        className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer leading-none ${
                          filters.type === t.val 
                            ? 'bg-lux-surface shadow-md text-lux-green-500 border border-white/20 dark:border-white/5' 
                            : 'text-lux-text/70 hover:text-lux-text hover:bg-lux-surface/40 border border-transparent'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Subject Chips Merged Seamlessly right inside the panel */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-lux-text/70 mr-1 block">Quick Subjects</span>
                  {[
                    { name: 'Mathematics', label: 'Math 🧮', color: 'bg-lux-surface/40 text-lux-text hover:bg-lux-surface/60 border-white/10 dark:border-white/5' },
                    { name: 'Physical Sciences', label: 'Physics ⚛️', color: 'bg-lux-surface/40 text-lux-text hover:bg-lux-surface/60 border-white/10 dark:border-white/5' },
                  ].map((sub) => {
                    const isSelected = filters.subject === sub.name;
                    return (
                      <button
                        key={sub.name}
                        type="button"
                        onClick={() => setFilters(prev => ({ ...prev, subject: isSelected ? 'All' : sub.name }))}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all duration-200 cursor-pointer backdrop-blur-md ${
                          isSelected
                            ? 'bg-lux-green-500/10 text-lux-green-500 border-lux-green-500/30 shadow-sm'
                            : `${sub.color}`
                        }`}
                      >
                        {sub.label} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Papers Library Grid Area */}
        <section className="flex flex-col space-y-6">
          
          {/* Paper list loader / empty states / card lists */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 8].map((idx) => (
                <div key={idx} className="glass-panel p-6 shadow-lux-sm h-88 flex flex-col justify-between animate-pulse">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="h-6 w-20 bg-lux-border rounded-full" />
                      <div className="h-6 w-24 bg-lux-border rounded-full" />
                    </div>
                    <div className="h-3 w-32 bg-lux-border rounded" />
                    <div className="h-7 w-full bg-lux-border rounded-lg" />
                    <div className="h-7 w-2/3 bg-lux-border rounded-lg" />
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="h-1 bg-lux-border rounded" />
                    <div className="flex gap-3 mt-2">
                      <div className="h-10 bg-lux-border rounded-xl flex-1" />
                      <div className="h-10 bg-lux-border rounded-xl flex-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl sm:rounded-3xl p-6 text-center space-y-3">
              <AlertCircle size={36} className="text-red-500 mx-auto" />
              <h3 className="text-lg font-bold text-red-900">Unable to load past papers</h3>
              <p className="text-red-600 text-sm max-w-md mx-auto">{error}</p>
              <Button size="sm" onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
                Retry Connection
              </Button>
            </div>
          ) : papers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {papers.map((paper, idx) => (
                <motion.div
                  key={`${paper.id}-${paper.type}-${idx}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <PaperCard 
                    paper={paper}
                    allPapers={papers}
                    onView={(p) => setViewPaper(p)}
                    onDownload={handleDownload}
                    downloadingId={downloadingId}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <EmptyState 
                title="No Past Papers Found" 
                description="We couldn't find any exam papers matching your current filters. Try relaxing filters, clearing your search key, or choosing other subjects."
                actionLabel="Reset All Filters"
                onAction={handleResetFilters}
              />
              {isAdmin && (
                <div className="bg-[var(--color-lux-green-500)]/5 border border-[var(--color-lux-green-500)]/20 rounded-[2rem] sm:rounded-[3rem] p-6 text-center max-w-lg mx-auto space-y-4">
                  <Database size={32} className="text-[var(--color-lux-green-500)] mx-auto animate-pulse" />
                  <h3 className="text-sm font-bold text-lux-text">Import Past Papers from Storage Vault</h3>
                  <p className="text-xs text-lux-text leading-relaxed">
                    You are logged in as an Administrator. There are currently 0 indexed papers in search lists but thousands are pre-loaded in your Firebase Storage. Reconcile them instantly!
                  </p>
                  <Button
                    onClick={() => {
                      setShowSyncModal(true);
                      setSyncStatus('idle');
                      setSyncLogs([]);
                    }}
                    className="bg-[var(--color-lux-green-500)] hover:bg-[var(--color-lux-green-800)] cursor-pointer"
                  >
                    Start Scanner Sync
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* MOBILE DRAWER DIALOG FOR FILTERS (Retractable bottom drawer) */}
      <AnimatePresence>
        {isMobileFiltersOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50 pointer-events-auto"
              onClick={() => setIsMobileFiltersOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-[32px] overflow-y-auto p-6 z-50 shadow-2xl pb-10"
            >
              <div className="flex items-center justify-between border-b border-lux-border pb-4 mb-5">
                <h3 className="font-serif font-black text-xl text-lux-text flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-[var(--color-lux-green-500)]" /> Filter Library
                </h3>
                <button 
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-1 hover:bg-lux-border rounded-full transition-colors"
                >
                  <X size={20} className="text-lux-text" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Search bar */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-lux-text">Search Keywords</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-lux-text" size={16} />
                    <input
                      type="text"
                      placeholder="e.g. Calculus, Newton laws"
                      className="w-full bg-lux-surface border border-lux-border/50 rounded-xl py-2 pl-9 pr-4 text-[11px] uppercase tracking-widest font-bold outline-none focus:border-lux-green-500 focus:bg-lux-bg transition-all placeholder:text-lux-text placeholder:normal-case placeholder:tracking-normal placeholder:font-medium text-lux-text shadow-inner"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Grade Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-lux-text">Grade Level</label>
                  <select
                    value={filters.grade}
                    onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                    className="w-full bg-lux-surface-alt border border-gray-205 rounded-xl py-2.5 px-3 text-sm font-semibold text-lux-text outline-none"
                  >
                    <option value="All">Grade 12 Only</option>
                    {GRADE_OPTIONS.map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>

                {/* Subject Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-lux-text">Subject</label>
                  <select
                    value={filters.subject}
                    onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-lux-surface-alt border border-gray-205 rounded-xl py-2.5 px-3 text-sm font-semibold text-lux-text outline-none"
                  >
                    <option value="All">All Subjects</option>
                    {SUBJECT_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Year Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-lux-text">Exam Year</label>
                  <select
                    value={filters.year}
                    onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full bg-lux-surface-alt border border-gray-205 rounded-xl py-2.5 px-3 text-sm font-semibold text-lux-text outline-none"
                  >
                    <option value="All">All Years (2025 - 2014)</option>
                    {YEAR_OPTIONS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Session Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-lux-text block">Exam Session</label>
                  <select
                    value={filters.session}
                    onChange={(e) => setFilters(prev => ({ ...prev, session: e.target.value }))}
                    className="w-full bg-lux-surface-alt border border-gray-205 rounded-xl py-2.5 px-3 text-sm font-semibold text-lux-text outline-none"
                  >
                    <option value="All">All Sessions</option>
                    {SESSION_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Type Selector (Paper vs Memo) */}
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-lux-text block">Document Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-lux-surface-alt border border-gray-205 rounded-xl py-2.5 px-3 text-sm font-semibold text-lux-text outline-none"
                  >
                    <option value="All">All Types (Paper + Memo)</option>
                    {TYPE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex gap-4">
                  <Button
                    className="flex-1 bg-lux-border hover:bg-lux-surface00 text-lux-text"
                    variant="outline"
                    onClick={handleResetFilters}
                  >
                    Reset
                  </Button>
                  <Button
                    className="flex-1 bg-[var(--color-lux-green-500)] hover:bg-[var(--color-lux-green-800)]"
                    onClick={() => setIsMobileFiltersOpen(false)}
                  >
                    Apply Filter
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FULLSCREEN EXAM PAPER VIEW MODAL (NO NEXT TAB TRIPS) */}
      <AnimatePresence>
        {viewPaper && (() => {
          const questionPaperObj = viewPaper.type === 'question' ? viewPaper : fullscreenCompanion;
          const memoPaperObj = viewPaper.type === 'memo' ? viewPaper : fullscreenCompanion;
          const activeDocObj = (activeDocType === 'question' ? questionPaperObj : memoPaperObj) || viewPaper;

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/95 flex flex-col pointer-events-auto h-screen w-screen"
            >
              {/* Modal Navigation Header Controls */}
              <div className="px-6 py-4 bg-lux-bg border-b border-lux-border flex flex-col md:flex-row items-center justify-between text-lux-text shrink-0 gap-4">
                <div className="flex items-center gap-3 min-w-0 self-start md:self-auto">
                  <div className="w-10 h-10 bg-[var(--color-lux-green-500)]/10 border border-[var(--color-lux-green-500)]/30 rounded-xl flex items-center justify-center text-[var(--color-lux-green-500)] shrink-0">
                    <Bookmark size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base md:text-lg font-bold truncate pr-4 font-serif text-lux-text">
                      {activeDocObj.title || `${activeDocObj.subject} ${activeDocObj.year}`}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-lux-text font-sans font-semibold">
                      <span>Grade {activeDocObj.grade}</span>
                      <span>•</span>
                      <span>{activeDocObj.paperNumber} ({activeDocObj.type === 'memo' ? 'Memo' : 'Question'})</span>
                      <span>•</span>
                      <span>{activeDocObj.language} Medium</span>
                    </div>
                  </div>
                </div>

                {/* Instant Fullscreen Companion Switcher */}
                {fullscreenCompanion && (
                  <div className="bg-gray-950 p-1 rounded-xl flex items-center border border-lux-border shrink-0 shadow-inner">
                    <button
                      onClick={() => setActiveDocType('question')}
                      className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer ${
                        activeDocType === 'question'
                          ? 'bg-[var(--color-lux-green-500)] text-lux-text shadow font-black'
                          : 'text-lux-text hover:text-lux-text'
                      }`}
                    >
                      Question Paper
                    </button>
                    <button
                      onClick={() => setActiveDocType('memo')}
                      className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer ${
                        activeDocType === 'memo'
                          ? 'bg-[var(--color-lux-green-500)] text-lux-text shadow font-black'
                          : 'text-lux-text hover:text-lux-text'
                      }`}
                    >
                      Memorandum
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                  <Button 
                    size="sm" 
                    className="bg-[var(--color-lux-green-500)] hover:bg-[var(--color-lux-green-800)] text-lux-text py-1.5 h-9 font-semibold text-xs font-sans px-3"
                    onClick={() => handleDownload(activeDocObj)}
                    disabled={downloadingId === activeDocObj.id}
                  >
                    <Download size={14} className="mr-1.5" />
                    {downloadingId === activeDocObj.id ? 'Downloading...' : 'Download File'}
                  </Button>
                  <button 
                    onClick={() => setViewPaper(null)}
                    className="p-2 hover:bg-lux-surface-alt rounded-full text-lux-text hover:text-lux-text transition-colors h-9 w-9 flex items-center justify-center border border-lux-border"
                    aria-label="Close View Mode"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Embedded Iframe Container */}
              <div className="flex-1 bg-gray-950 p-2 md:p-6 overflow-hidden flex flex-col items-center justify-center w-full relative min-h-[400px]">
                {/* Elegant Custom Skeleton for IFrame Documents */}
                {((activeDocType === 'question' && questionLoading && questionPaperObj) || 
                  (activeDocType === 'memo' && memoLoading && memoPaperObj)) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-lux-text z-20 pointer-events-none animate-fade-in">
                    <div className="relative flex items-center justify-center mb-4">
                      <div className="absolute h-12 w-12 rounded-full border border-lux-border animate-ping"></div>
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--color-lux-green-500)] border-t-transparent shadow-inner"></div>
                    </div>
                    <p className="text-sm font-sans font-semibold text-lux-text tracking-wide animate-pulse">
                      Loading PDF Document securely...
                    </p>
                    <p className="text-xs text-lux-text mt-1 max-w-xs text-center leading-relaxed">
                      Powered by secure cloud storage vault
                    </p>
                  </div>
                )}

                <div className="relative w-full max-w-5xl h-full flex-1">
                  {/* Question Paper IFrame */}
                  {questionPaperObj && (
                    <iframe 
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(questionPaperObj.fileUrl)}&embedded=true`} 
                      onLoad={() => setQuestionLoading(false)}
                      className={`absolute inset-0 w-full h-full rounded-2xl sm:rounded-3xl border border-lux-border shadow-lux-sm bg-lux-surface transition-all duration-300 ${
                        activeDocType === 'question' 
                          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto z-10' 
                          : 'opacity-0 scale-95 translate-y-4 pointer-events-none z-0'
                      }`}
                      title={`Premium Question Preview: ${questionPaperObj.title}`}
                      referrerPolicy="no-referrer"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                  )}

                  {/* Memorandum IFrame */}
                  {memoPaperObj && (
                    <iframe 
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(memoPaperObj.fileUrl)}&embedded=true`} 
                      onLoad={() => setMemoLoading(false)}
                      className={`absolute inset-0 w-full h-full rounded-2xl sm:rounded-3xl border border-lux-border shadow-lux-sm bg-lux-surface transition-all duration-300 ${
                        activeDocType === 'memo' 
                          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto z-10' 
                          : 'opacity-0 scale-95 translate-y-4 pointer-events-none z-0'
                      }`}
                      title={`Premium Memo Preview: ${memoPaperObj.title}`}
                      referrerPolicy="no-referrer"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* DATABASE STORAGE SYNCHRONIZATION MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#0d0d0d] border border-lux-border rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-lux-border flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--color-lux-green-500)]/10 text-[var(--color-lux-green-500)] rounded-xl font-bold">
                  <Database size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-lux-text">Database & Storage Sync Utility</h3>
                  <p className="text-xs text-lux-text">Reconcile Storage Vault files into website's Firestore database</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSyncModal(false)}
                className="p-1.5 text-lux-text hover:text-lux-text hover:bg-lux-bg rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {syncStatus === 'idle' ? (
                <div className="space-y-4">
                  <p className="text-sm text-lux-text leading-relaxed">
                    This scanning suite traverses your Firebase Storage <code className="bg-black text-[var(--color-lux-green-500)] px-1.5 py-0.5 rounded font-mono text-xs font-bold">/past-papers</code> bucket directories and cross-examines every physical file against registered indices inside your Firestore database.
                  </p>
                  <p className="text-sm text-lux-text leading-relaxed">
                    Any paper, memorandum, or booklet discovered in Storage that hasn't been listed on the website yet will be imported in batches. Attributes like subject, curriculum alignment, grade, year, and paper type are automatically deduced with smart heuristic algorithms!
                  </p>
                  <div className="p-4 bg-[#111111] border border-lux-border rounded-2xl sm:rounded-3xl flex items-start gap-3">
                    <AlertCircle className="text-[var(--color-lux-green-500)] shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-lux-text space-y-1">
                      <p className="font-bold text-lux-text">Important details:</p>
                      <p>• Avoid closing this tab or putting your browser to sleep during synchronization.</p>
                      <p>• Existing indexes with matching URLs or file paths are fully protected and will not duplicate.</p>
                      <p>• Expected Storage scope of files: 3,000+ items</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Active Step Indicator */}
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-lux-green-500)]">
                      CURRENT STEP: {syncStep || 'Processing...'}
                    </span>
                    {syncStatus === 'running' && (
                      <span className="text-xs text-lux-text flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-[var(--color-lux-green-500)]" /> Sync active...
                      </span>
                    )}
                  </div>

                  {/* Progress grid indices */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-black border border-lux-border rounded-2xl sm:rounded-3xl text-center">
                      <span className="text-[10px] uppercase font-bold text-lux-text tracking-wider">Storage Scanned</span>
                      <div className="text-xl font-black text-lux-text mt-1">{syncCount.scanned}</div>
                    </div>
                    <div className="p-4 bg-black border border-lux-border rounded-2xl sm:rounded-3xl text-center">
                      <span className="text-[10px] uppercase font-bold text-lux-text tracking-wider">Database Checked</span>
                      <div className="text-xl font-black text-lux-text mt-1">{syncCount.checked}</div>
                    </div>
                    <div className="p-4 bg-black border border-lux-border rounded-2xl sm:rounded-3xl text-center">
                      <span className="text-[10px] uppercase font-bold text-lux-text tracking-wider">To Import</span>
                      <div className="text-xl font-black text-[var(--color-lux-green-500)] mt-1">{syncCount.totalToSync}</div>
                    </div>
                    <div className="p-4 bg-black border border-lux-border rounded-2xl sm:rounded-3xl text-center border-[var(--color-lux-green-500)]/20 bg-[var(--color-lux-green-500)]/5">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-lux-green-500)]/70 tracking-wider">Successfully Added</span>
                      <div className="text-xl font-black text-lux-text mt-1">{syncCount.added}</div>
                    </div>
                  </div>

                  {/* Sync progress bar */}
                  {syncStatus === 'running' && syncCount.totalToSync > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-lux-text">
                        <span>Writing Indexed past-papers to Firestore...</span>
                        <span className="font-bold text-lux-text">
                          {Math.round((syncCount.added / syncCount.totalToSync) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-black rounded-full overflow-hidden border border-lux-border">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-[var(--color-lux-green-500)] transition-all duration-300"
                          style={{ width: `${Math.round((syncCount.added / syncCount.totalToSync) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Streaming Activity Logs Terminal */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-lux-text">
                      <span className="flex items-center gap-1.5 font-bold"><Terminal size={14} /> SYSTEM FEED</span>
                      <span className="font-mono text-[10px]">CWD: ~/storage/past-papers</span>
                    </div>
                    <div 
                      ref={logContainerRef}
                      className="p-4 bg-black border border-lux-border rounded-2xl sm:rounded-3xl h-64 overflow-y-auto font-mono text-[10px] text-green-400 space-y-1.5 custom-scrollbar"
                    >
                      {syncLogs.length === 0 ? (
                        <div className="text-lux-text italic">No output. Waiting for engine...</div>
                      ) : (
                        syncLogs.map((log, lidx) => (
                          <div key={lidx} className="leading-relaxed break-all">
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-lux-border bg-black/40 flex items-center justify-end gap-3">
              {syncStatus === 'idle' ? (
                <>
                  <button 
                    onClick={() => setShowSyncModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-lux-border hover:bg-lux-bg text-sm font-bold text-lux-text hover:text-lux-text transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button 
                    onClick={handleSyncStorage}
                    className="px-6 py-2.5 rounded-xl bg-[var(--color-lux-green-500)] hover:bg-[#178562] text-sm font-bold text-lux-text transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Database size={16} /> Start Live Scan & Sync
                  </button>
                </>
              ) : syncStatus === 'running' ? (
                <>
                  <button 
                    onClick={() => setShowSyncModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-lux-border hover:bg-lux-bg text-sm font-bold text-lux-text hover:text-lux-text transition-colors cursor-pointer"
                  >
                    Hide
                  </button>
                  <button 
                    disabled
                    className="px-6 py-2.5 rounded-xl bg-lux-bg text-lux-text text-sm font-bold flex items-center gap-2 border border-lux-border"
                  >
                    <Loader2 size={16} className="animate-spin text-[var(--color-lux-green-500)]" /> Reconciling in progress...
                  </button>
                </>
              ) : syncStatus === 'completed' ? (
                <button 
                  onClick={() => {
                    setShowSyncModal(false);
                    setSyncStatus('idle');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[var(--color-lux-green-500)] hover:bg-[#178562] text-sm font-bold text-lux-text transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Check size={16} /> Finish & Done
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setShowSyncModal(false);
                      setSyncStatus('idle');
                    }}
                    className="px-5 py-2.5 rounded-xl border border-lux-border hover:bg-lux-bg text-sm font-bold text-lux-text hover:text-lux-text transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button 
                    onClick={handleSyncStorage}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold text-lux-text transition-colors cursor-pointer"
                  >
                    Retry sync
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
