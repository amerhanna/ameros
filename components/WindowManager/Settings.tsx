"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Settings() {
  return (
    <div className="p-6 flex flex-col h-full bg-gray-50 overflow-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Settings</h2>
      
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appearance" className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Dark Mode</Label>
              <p className="text-sm text-gray-500">Enable dark theme across the system.</p>
            </div>
            <Switch />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Transparency Effects</Label>
              <p className="text-sm text-gray-500">Make taskbar and windows slightly transparent.</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Accent Color</Label>
            <div className="flex gap-2">
              {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                <button 
                  key={color} 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm" 
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Display Resolution</h3>
            <p className="text-sm text-gray-500 mb-4">Current: 1920 x 1080 (Recommended)</p>
            <Button variant="outline" size="sm">Change Settings</Button>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Sound Outputs</h3>
            <p className="text-sm text-gray-500 mb-4">Speakers (Realtek Audio)</p>
            <Button variant="outline" size="sm">Volume Mixer</Button>
          </div>
        </TabsContent>
        
        <TabsContent value="about" className="space-y-4">
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm text-center">
            <div className="text-4xl mb-4 text-blue-600 font-bold italic">AmerOS</div>
            <p className="text-gray-600 font-medium">Version 1.0.0 (Build 2026.03)</p>
            <p className="text-sm text-gray-400 mt-2">© 2026 AmerH. All rights reserved.</p>
            <div className="mt-6 pt-6 border-t border-gray-100 italic text-sm text-gray-500">
              "Bringing gravity to the antigravity experiment."
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-auto pt-8 flex justify-end gap-3">
        <Button variant="outline">Reset to Defaults</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
