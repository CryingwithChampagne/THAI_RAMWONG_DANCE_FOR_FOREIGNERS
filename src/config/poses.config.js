import shortDokmai from '../data/DT01_Dok_mai_khong_chat/video/short_dokmai.mp4';
import shortKheng from '../data/DT02_Khuen_duean_ngai/video/short_kheng.mp4';
import shortRumsi from '../data/DT03_Ram_si_ma_ram/video/short_rumsi.mp4';
import titleDokmai from '../data/DT01_Dok_mai_khong_chat/pictures/01_title.jpg';
import titleKheng from '../data/DT02_Khuen_duean_ngai/pictures/02_title.jpg';
import titleRumsi from '../data/DT03_Ram_si_ma_ram/pictures/03_title.jpg';

const createPhaseFeedbackFormatter = () => {
  return (evaluation, phase) => {
    const currentPhase = phase || 3;
    let feedbacksToShow = [];

    if (currentPhase === 1) {
      feedbacksToShow = evaluation?.handFeedbacks || [];
    } else if (currentPhase === 2) {
      feedbacksToShow = evaluation?.poseFeedbacks || [];
    } else if (currentPhase === 3) {
      feedbacksToShow = [
        ...(evaluation?.handFeedbacks || []),
        ...(evaluation?.poseFeedbacks || []),
      ];
    }

    return Array.from(new Set(feedbacksToShow));
  };
};

export const POSE_SUMMARIES = [
  {
    id: 3,
    icon: '👋',
    name: 'Ram si ma ram',
    desc: 'Easy poses for beginners',
    img: titleRumsi,
    shortVideo: shortRumsi,
  },
  {
    id: 2,
    icon: '🌙',
    name: 'Khuen duean ngai',
    desc: 'Intermediate poses for beginners',
    img: titleKheng,
    shortVideo: shortKheng,
  },
  {
    id: 1,
    icon: '🌸',
    name: 'Dok mai khong chat',
    desc: 'Advanced poses for beginners',
    img: titleDokmai,
    shortVideo: shortDokmai,
  },
];

const lessonLoaders = {
  1: async () => {
    const [tutorial, picture, danceVideo] = await Promise.all([
      import('../data/DT01_Dok_mai_khong_chat/01_tutorial.js'),
      import('../data/DT01_Dok_mai_khong_chat/pictures/01_pic.png'),
      import('../data/DT01_Dok_mai_khong_chat/video/DT01_dance.mp4'),
    ]);
    return { tutorial: tutorial.default, picture: picture.default, danceVideo: danceVideo.default };
  },
  2: async () => {
    const [tutorial, picture, danceVideo] = await Promise.all([
      import('../data/DT02_Khuen_duean_ngai/02_tutorial.js'),
      import('../data/DT02_Khuen_duean_ngai/pictures/02_pic.png'),
      import('../data/DT02_Khuen_duean_ngai/video/DT02_dance.mp4'),
    ]);
    return { tutorial: tutorial.default, picture: picture.default, danceVideo: danceVideo.default };
  },
  3: async () => {
    const [tutorial, picture, danceVideo] = await Promise.all([
      import('../data/DT03_Ram_si_ma_ram/03_tutorial.js'),
      import('../data/DT03_Ram_si_ma_ram/pictures/03_pic.png'),
      import('../data/DT03_Ram_si_ma_ram/video/DT03_dance.mp4'),
    ]);
    return { tutorial: tutorial.default, picture: picture.default, danceVideo: danceVideo.default };
  },
};

export async function loadPoseDetails(poseId) {
  const summary = POSE_SUMMARIES.find(pose => pose.id === poseId);
  const loader = lessonLoaders[poseId];
  if (!summary || !loader) return null;

  const details = await loader();
  return {
    ...summary,
    ...details.tutorial,
    picture: details.picture,
    danceVideo: details.danceVideo,
    feedbackFormatter: createPhaseFeedbackFormatter(),
  };
}
