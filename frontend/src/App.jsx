import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { RequireAuth } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Posts from './pages/Posts.jsx';
import PostPage from './pages/PostPage.jsx';
import Developers from './pages/Developers.jsx';
import Profile from './pages/Profile.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Editor from './pages/Editor.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="posts" element={<Posts />} />
        <Route path="posts/:slug" element={<PostPage />} />
        <Route path="developers" element={<Developers />} />
        <Route path="u/:username" element={<Profile />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="write" element={<RequireAuth><Editor /></RequireAuth>} />
        <Route path="edit/:slug" element={<RequireAuth><Editor /></RequireAuth>} />
        <Route path="settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
