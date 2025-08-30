import { BrowserRouter, Routes, Route } from 'react-router-dom'
import React from 'react'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'

const AppRoutes = () => {
    return (

        <BrowserRouter>
            <Routes>
                <Route path='/' element={<Register />} />
                <Route path='/home' element={<Home />} />
                <Route path='/login' element={<Login />} />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes