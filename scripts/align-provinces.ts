import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'firebase-applet-config.json');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  appId: config.appId
});
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '(default)');

interface ParseMeta {
  title: string;
  subject: string;
  grade: number;
  year: number;
  curriculum: 'NSC' | 'IEB';
  paperNumber: 'P1' | 'P2' | 'P3' | 'P4';
  type: 'question' | 'memo';
  language: 'English' | 'Afrikaans';
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

  // 8. Generate title with clean casing
  let suffix = '';
  if (type === 'memo') {
    suffix = ' Memo';
  }
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
    session,
    province
  };
};

async function run() {
  console.log('📬 Fetching papers from Firestore...');
  const snap = await getDocs(collection(db, 'past-papers'));
  console.log(`✅ Loaded ${snap.size} documents.`);

  const updates: { id: string, docObj: any }[] = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (!data.storagePath) return;
    const meta = parseStorageFile(data.storagePath, data.storagePath.split('/').pop() || '');
    
    // Check if province is missing or mismatched, or session or title is incorrect
    const needUpdate = !data.province || data.province !== meta.province || data.session !== meta.session || data.title !== meta.title;
    if (needUpdate) {
      updates.push({
        id: docSnap.id,
        docObj: {
          province: meta.province,
          session: meta.session,
          title: meta.title
        }
      });
    }
  });

  console.log(`⚡ Need to align ${updates.length} documents.`);
  if (updates.length === 0) {
    console.log('💯 Already fully aligned!');
    return;
  }

  // Update in serial batches of 100 to prevent transaction overflow
  const BATCH_SIZE = 100;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(up => {
      batch.update(doc(db, 'past-papers', up.id), up.docObj);
    });
    await batch.commit();
    console.log(`   Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(updates.length / BATCH_SIZE)} (${i + chunk.length}/${updates.length})`);
  }
  console.log('🎉 Done alignment!');
  process.exit(0);
}
run().catch(console.error);
