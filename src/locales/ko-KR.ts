export default {
  common: {
    add: '추가',
    addSuccess: '성공적으로 추가',
    edit: '편집',
    editSuccess: '편집 성공',
    delete: '삭제',
    deleteSuccess: '삭제 성공',
    save: '저장',
    test: '테스트',
    saveSuccess: '저장 성공',
    reset: '재설정',
    action: '액션',
    export: '내보내기',
    exportSuccess: '내보내기 성공',
    import: '가져오기',
    importSuccess: '가져오기 성공',
    clear: '지우기',
    clearSuccess: '지우기 성공',
    yes: '예',
    no: '아니오',
    confirm: '확인',
    download: '다운로드',
    noData: '데이터 없음',
    wrong: '문제가 발생했습니다, 나중에 다시 시도하세요.',
    success: '성공',
    failed: '실패',
    register: '등록',
    login: '로그인',
    notLoggedIn: '로그인/등록',
    logOut: '로그아웃',
    unauthorizedTips: '승인되지 않음, 로그인 해주세요.',
    email: '이메일',
    password: '비밀번호',
    passwordConfirm: '비밀번호 확인',
    resetPassword: '암호를 재설정',
    resetPasswordMail: '비밀번호 재설정 메일 보내기',
    auditTip: 'Sensitive words do not take effect on Admin.',
  },
  chat: {
    newChatButton: '새 채팅',
    placeholder: '무엇이든 물어보세요...(시프트 + 엔터 = 줄 바꿈, "/"로 프롬프트 트리거)',
    placeholderMobile: '무엇이든 물어보세요...',
    copy: '복사',
    copied: '복사됨',
    copyCode: '코드 복사',
    clearChat: '채팅을 지우다',
    clearChatConfirm: '정말 이 채팅을 지우시겠습니까?',
    exportImage: '이미지 내보내기',
    exportImageConfirm: '이 채팅을 png로 내보내시겠습니까?',
    exportSuccess: '내보내기 성공',
    exportFailed: '내보내기 실패',
    usingContext: '컨텍스트 모드',
    turnOnContext: '현재 모드에서는 메시지를 보내면 이전 채팅 기록이 포함됩니다.',
    turnOffContext: '현재 모드에서는 메시지를 보낼 때 이전 채팅 기록이 포함되지 않습니다.',
    deleteMessage: '메시지 삭제',
    deleteMessageConfirm: '이 메시지를 정말 삭제하시겠습니까?',
    deleteHistoryConfirm: '이 기록을 지우시겠습니까?',
    clearHistoryConfirm: '채팅 기록을 지우시겠습니까?',
    preview: '미리보기',
    showRawText: '원시 텍스트로 표시',
    usageEstimate: '예상',
    usagePrompt: '질문',
    usageResponse: '답변',
    usageTotal: '총 소비 token',
    deleteUser: 'Delete User',
    setUserRole: 'Set Role',
    deleteUserConfirm: 'Are you sure to delete this user? After deletion, this email can never be registered or logged in again.',
    verifiedUser: 'Verified User',
    deleteKey: 'Delete Key',
    editKeyButton: 'Edit Key',
    deleteKeyConfirm: 'Are you sure to delete this key?',
  },
  setting: {
    setting: '설정',
    general: '일반',
    advanced: '고급',
    config: '기본 구성',
    statistics: '통계학',
    siteConfig: '사이트 구성',
    mailConfig: '메일 구성',
    auditConfig: '감사 구성',
    avatarLink: '아바타 링크',
    name: '이름',
    description: '설명',
    saveUserInfo: '사용자 정보 저장',
    role: '역할',
    userBalance: '잔액',
    chatHistory: '채팅 기록',
    theme: '테마',
    language: '언어',
    api: 'API',
    reverseProxy: '역방향 프록시',
    timeout: '시간 초과(ms)',
    socks: 'Socks',
    socksAuth: 'socksAuth',
    httpsProxy: 'HTTPS 프록시',
    balance: 'API 잔액',
    statisticsPeriod: '통계 기간',
    statisticsPeriodLastMonth: '지난달',
    statisticsPeriodCurrentMonth: '이번달',
    statisticsPeriodLast30Days: '최근 30일',
    statisticsPrompt: '질문',
    statisticsCompletion: '답변',
    statisticsTotal: '합계',
    smtpHost: 'smtp호스트',
    smtpPort: 'smtp포트',
    smtpTsl: 'smtpTsl',
    smtpUserName: 'smtp사용자 이름',
    smtpPassword: 'smtp비밀번호',
    siteTitle: '제목',
    siteDomain: '도메인',
    registerEnabled: '등록 활성화',
    registerReview: '등록 리뷰',
    registerMails: '메일 등록',
    apiBaseUrl: 'API 베이스 URL',
    apiModel: '인터페이스 유형',
    accessToken: '액세스 토큰',
    loginEnabled: '로그인 활성화',
    loginSalt: '로그인 정보 암호화 Salt',
    loginSaltTip: '변경하면 모든사용자의 로그인이 풀립니다.',
    monthlyUsage: '월간 사용량',
    auditEnabled: '타사',
    auditProvider: '공급자',
    auditApiKey: 'Api Key',
    auditApiSecret: 'Api Secret',
    auditTest: '테스트 텍스트',
    auditBaiduLabel: 'Label',
    auditBaiduLabelTip: '영어 쉼표로 구분, If empty, only politics.',
    auditBaiduLabelLink: '레이블 세부 정보로 이동',
    auditCustomizeEnabled: '맞춤화하다',
    auditCustomizeWords: '단어 맞춤설정',
    accessTokenExpiredTime: '만료된 시간',
    userConfig: 'Users',
    keysConfig: 'Keys Manager',
    userRoles: 'User Role',
    status: 'Status',
    chatModels: 'Chat Models',
    remark: 'Remark',
  },
  store: {
    siderButton: '프롬프트 스토어',
    local: '로컬',
    online: '온라인',
    title: '제목',
    description: '설명',
    clearStoreConfirm: '데이터를 지우시겠습니까?',
    importPlaceholder: '여기에 JSON 데이터를 붙여넣으세요',
    addRepeatTitleTips: '제목 중복, 다시 입력하세요',
    addRepeatContentTips: '콘텐츠 중복: {msg}, 다시 입력하세요',
    editRepeatTitleTips: '제목 충돌, 수정하세요',
    editRepeatContentTips: '콘텐츠 충돌 {msg} 다시 입력하세요',
    importError: '키 값 불일치',
    importRepeatTitle: '제목 중복 건너뛰기: {msg}',
    importRepeatContent: '중복 콘텐츠 건너뛰기: {msg}',
    onlineImportWarning: '참고: JSON 파일 소스를 확인하세요!',
    downloadError: '네트워크 상태와 JSON 파일 유효성을 확인하세요',
  },
}
