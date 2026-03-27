// Timer application
class Timer {
    constructor() {
        this.startTime = 0;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.isRunning = false;
        this.laps = [];
        
        // DOM elements
        this.timeDisplay = document.getElementById('timeDisplay');
        this.msDisplay = document.getElementById('msDisplay');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.lapBtn = document.getElementById('lapBtn');
        this.lapList = document.getElementById('lapList');
        
        // Bind event listeners
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.lapBtn.addEventListener('click', () => this.recordLap());
        
        // Initialize display
        this.updateDisplay();
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startTime = Date.now() - this.elapsedTime;
            
            this.timerInterval = setInterval(() => {
                this.elapsedTime = Date.now() - this.startTime;
                this.updateDisplay();
            }, 10);
            
            // Update button states
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.startBtn.innerHTML = '<i class="fas fa-play"></i> Running';
            this.pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        }
    }
    
    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            clearInterval(this.timerInterval);
            
            // Update button states
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.startBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            this.pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Paused';
        }
    }
    
    reset() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.elapsedTime = 0;
        this.laps = [];
        
        // Update button states
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.startBtn.innerHTML = '<i class="fas fa-play"></i> Start';
        this.pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        
        // Update display and clear laps
        this.updateDisplay();
        this.updateLapList();
    }
    
    recordLap() {
        if (this.elapsedTime > 0) {
            const lapTime = this.elapsedTime;
            const previousLapTime = this.laps.length > 0 ? this.laps[this.laps.length - 1].time : 0;
            const difference = lapTime - previousLapTime;
            
            this.laps.push({
                number: this.laps.length + 1,
                time: lapTime,
                difference: difference
            });
            
            this.updateLapList();
            
            // Add visual feedback
            this.lapBtn.innerHTML = '<i class="fas fa-check"></i> Lap Recorded';
            this.lapBtn.style.backgroundColor = '#2ecc71';
            this.lapBtn.style.borderColor = '#2ecc71';
            this.lapBtn.style.color = 'white';
            
            setTimeout(() => {
                this.lapBtn.innerHTML = '<i class="fas fa-plus"></i> Record Lap';
                this.lapBtn.style.backgroundColor = '';
                this.lapBtn.style.borderColor = '';
                this.lapBtn.style.color = '';
            }, 1000);
        }
    }
    
    updateDisplay() {
        const totalSeconds = Math.floor(this.elapsedTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor((this.elapsedTime % 1000) / 10);
        
        // Format time with leading zeros
        const formattedHours = hours.toString().padStart(2, '0');
        const formattedMinutes = minutes.toString().padStart(2, '0');
        const formattedSeconds = seconds.toString().padStart(2, '0');
        const formattedMs = milliseconds.toString().padStart(2, '0');
        
        this.timeDisplay.textContent = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        this.msDisplay.textContent = formattedMs;
    }
    
    updateLapList() {
        if (this.laps.length === 0) {
            this.lapList.innerHTML = '<div class="empty-lap">No lap times recorded yet</div>';
            return;
        }
        
        let lapHTML = '';
        
        this.laps.forEach(lap => {
            const lapTime = this.formatTime(lap.time);
            const diffTime = this.formatTime(lap.difference);
            const diffSign = lap.difference >= 0 ? '+' : '-';
            
            lapHTML += `
                <div class="lap-item">
                    <div class="lap-number">Lap ${lap.number}</div>
                    <div class="lap-time">${lapTime}</div>
                    <div class="lap-difference">${diffSign}${diffTime}</div>
                </div>
            `;
        });
        
        this.lapList.innerHTML = lapHTML;
        
        // Scroll to the latest lap
        this.lapList.scrollTop = this.lapList.scrollHeight;
    }
    
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((milliseconds % 1000) / 10);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        }
    }
}

// Initialize timer when page loads
document.addEventListener('DOMContentLoaded', () => {
    const timer = new Timer();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Space to start/pause
        if (e.code === 'Space') {
            e.preventDefault();
            if (timer.isRunning) {
                timer.pause();
            } else {
                timer.start();
            }
        }
        
        // 'L' key to record lap
        if (e.code === 'KeyL') {
            e.preventDefault();
            timer.recordLap();
        }
        
        // 'R' key to reset
        if (e.code === 'KeyR') {
            e.preventDefault();
            timer.reset();
        }
    });
});