var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
    name: 'Arduino Sound visualizer',
    description: 'Visualize sound throught arduino with node.js',
    script: require('path').join(__dirname, 'start.js')
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
    svc.start();
});

svc.install();
