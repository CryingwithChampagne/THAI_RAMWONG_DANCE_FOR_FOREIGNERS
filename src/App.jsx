import { useState } from 'react';
import Home from './pages/Home.jsx';
import PoseSelection from './pages/PoseSelection.jsx';
import LearningStudio from './pages/LearningStudio.jsx';
import FeedbackPage from './pages/FeedbackPage.jsx';

export default function ThaiDanceApp() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedPose, setSelectedPose] = useState(null);
  const [finalAverageScore, setFinalAverageScore] = useState(0);

  return (
    <div className="font-sans antialiased text-gray-200">
      {currentPage === 'home' && <Home setCurrentPage={setCurrentPage} />}
      {currentPage === 'select-pose' && <PoseSelection setCurrentPage={setCurrentPage} setSelectedPose={setSelectedPose} />}
      {currentPage === 'learning' && <LearningStudio selectedPose={selectedPose} setCurrentPage={setCurrentPage} setFinalAverageScore={setFinalAverageScore} />}
      {currentPage === 'feedback' && <FeedbackPage setCurrentPage={setCurrentPage} finalAverageScore={finalAverageScore} selectedPose={selectedPose} />}
    </div>
  );
}