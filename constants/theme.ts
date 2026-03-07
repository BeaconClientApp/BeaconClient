export const getGenderColor = (gender?: string) => {
    switch(gender?.toLowerCase()) {
        case 'female': return '#ff74a6'; 
        case 'male': return '#54a0ff'; 
        case 'herm': return '#8e44ad'; 
        case 'male-herm': return '#2980b9'; 
        case 'shemale': return '#d2a8ff'; 
        case 'cunt-boy': return '#1dd1a1'; 
        case 'transgender': return '#ff9f43'; 
        case 'none': default: return '#c5a3ff'; 
    }
};

export const getStatusIcon = (status?: string) => {
    switch(status?.toLowerCase()) {
        case 'looking': return 'eye'; 
        case 'busy': return 'settings'; 
        case 'away': return 'ellipse'; 
        case 'dnd': return 'remove-circle'; 
        case 'online': default: return 'person'; 
    }
};

export const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
        case 'online': return '#3498db'; 
        case 'looking': return '#2ecc71'; 
        case 'busy': return '#e74c3c'; 
        case 'dnd': return '#c0392b'; 
        case 'idle': return '#f39c12'; 
        case 'away': return '#95a5a6'; 
        case 'crown': return '#9b59b6'; 
        default: return '#888'; 
    }
};

export const STATUS_OPTIONS = ['online', 'looking', 'busy', 'dnd', 'idle', 'away'];

export const BBCODE_COLORS = [
    { name: 'red', hex: '#ff4757' }, { name: 'blue', hex: '#3742fa' }, 
    { name: 'white', hex: '#ffffff' }, { name: 'yellow', hex: '#eccc68' }, 
    { name: 'pink', hex: '#ff9ff3' }, { name: 'gray', hex: '#747d8c' }, 
    { name: 'green', hex: '#2ed573' }, { name: 'orange', hex: '#ffa502' }, 
    { name: 'purple', hex: '#9b59b6' }, { name: 'black', hex: '#111111' }, 
    { name: 'brown', hex: '#8B4513' }, { name: 'cyan', hex: '#00d2d3' }
];