#import "GotoPlugin.h"

@implementation GotoPlugin


-(void) goto:(CDVInvokedUrlCommand*)command
{
    NSString* fromLat = [command.arguments objectAtIndex:0];
    NSString* fromLng = [command.arguments objectAtIndex:1];
    NSString* toLat = [command.arguments objectAtIndex:2];
    NSString* toLng = [command.arguments objectAtIndex:3];

    NSMutableArray *_url = [NSMutableArray arrayWithObjects:@"http://maps.apple.com/?saddr=",fromLat,@",",fromLng,@"&daddr=", toLat,@",", toLng, nil];

    NSURL *url = [[NSURL alloc] initWithString:[_url componentsJoinedByString:@""]];
    [[UIApplication sharedApplication] openURL:url];
}


-(void) getDeviceId:(CDVInvokedUrlCommand*)command
{
    NSString *uuidString = [[[UIDevice currentDevice] identifierForVendor] UUIDString];
    NSString *uuidName   = [[UIDevice currentDevice] name];
    NSMutableArray    *resultsArray      = [[NSMutableArray alloc]init];
    
    [resultsArray addObject:uuidName];
    [resultsArray addObject:uuidString];
    
    CDVPluginResult* pluginResult = nil;
    
    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:resultsArray ];
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

@end
